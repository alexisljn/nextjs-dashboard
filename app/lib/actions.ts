'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Client } from 'pg';
import { z } from 'zod';

async function connectToDatabase() {
	const client = new Client({
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		host: process.env.POSTGRES_HOST,
		port: 5432,
		database: process.env.POSTGRES_DATABASE
	})

	await client.connect()

	return client;
}

const FormSchema = z.object({
	id: z.string(),
	customerId: z.string({
		invalid_type_error: "Please select a customer",
		required_error: "Please select a customer",
	}),
	amount: z.coerce
		.number()
		.gt(0, {message: "Please enter an amount greater than 0"}),
	status: z.enum(['pending', 'paid'], {invalid_type_error: "Please select an invoice status"}),
	date: z.string(),
});

export type State = {
	errors?: {
		customerId?: string[];
		amount?: string[];
		status?: string[];
	};
	message?: string | null;
};

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const UpdateInvoice = FormSchema.omit({ id: true, date: true });


export async function createInvoice(prevState: State,formData: FormData) {
	const validatedFields = CreateInvoice.safeParse(Object.fromEntries(formData));

	console.log("validatedFields", validatedFields.error?.flatten().fieldErrors);
	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: "Missing Fields. Failed to create invoice",
		}
	}

	const { customerId, amount, status } = validatedFields.data;

	const amountInCents = amount * 100;

	const date = new Date().toISOString().split('T')[0];
	
	try {
		const client = await connectToDatabase();

		await client.query(`INSERT INTO invoices (customer_id, amount, status, date) VALUES ($1, $2, $3, $4)`, [customerId, amountInCents, status, date]);

		await client.end();
	} catch (error: any) {
		return {
			message: "Database Error. Failed to create invoice",
		}
	}

	revalidatePath('/dashboard/invoices'); // Related to current user (meaning we're mutating his client side router cache)

	redirect('/dashboard/invoices');
}


export async function updateInvoice(id: string, prevState: State, formData: FormData) {
	// Get values one by one from FormData
	const validatedFields = UpdateInvoice.safeParse({
		customerId: formData.get('customerId'),
		amount: formData.get('amount'),
		status: formData.get('status'),
	});

	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
			message: 'Missing Fields. Failed to Update Invoice.',
		};
	}

	const { customerId, amount, status } = validatedFields.data;
	
	const amountInCents = amount * 100;
	
	try {
		const client = await connectToDatabase();

		await client.query(`
			UPDATE invoices
			SET customer_id = $1, amount = $2, status = $3
			WHERE id = $4
		`, [customerId, amountInCents, status, id]);

		await client.end();
	} catch (error: any) {
		return {
			message: "Database Error. Failed to update invoice",
		}
	}
	
	revalidatePath('/dashboard/invoices');

	redirect('/dashboard/invoices');
}

/* Since this action is being called in the /dashboard/invoices path, we don't need to call redirect. 
 * Calling revalidatePath will trigger a new server request and re-render the table.
 */
export async function deleteInvoice(id: string) {
	try {
		const client = await connectToDatabase();

		await client.query(`DELETE FROM invoices WHERE id = $1`, [id]);

		await client.end();

		revalidatePath('/dashboard/invoices');	
	} catch (error: any) {
		console.error(error);
	}
}

export async function authenticate(
prevState: string | undefined,
formData: FormData,
) {
	try {
		await signIn('credentials', formData);
	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case 'CredentialsSignin':
					return 'Invalid credentials.';
				default:
					return 'Something went wrong.';
			}
		}
		throw error;
	}
}