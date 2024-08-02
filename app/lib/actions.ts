'use server';

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
	customerId: z.string(),
	amount: z.coerce.number(),
	status: z.enum(['pending', 'paid']),
	date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const UpdateInvoice = FormSchema.omit({ id: true, date: true });


export async function createInvoice(formData: FormData) {
	try {
		const { customerId, amount, status } = CreateInvoice.parse(Object.fromEntries(formData));

		const amountInCents = amount * 100;

		const date = new Date().toISOString().split('T')[0];

		const client = await connectToDatabase();

		await client.query(`INSERT INTO invoices (customer_id, amount, status, date) VALUES ($1, $2, $3, $4)`, [customerId, amountInCents, status, date]);

		await client.end();
	} catch (error: any) {
		console.error(error);
	}

	revalidatePath('/dashboard/invoices'); // Related to current user (meaning we're mutating his client side router cache)

	redirect('/dashboard/invoices');
}


export async function updateInvoice(id: string, formData: FormData) {
	try {
		// Get values one by one from FormData
		const { customerId, amount, status } = UpdateInvoice.parse({
			customerId: formData.get('customerId'),
			amount: formData.get('amount'),
			status: formData.get('status'),
		});

		const amountInCents = amount * 100;

		const client = await connectToDatabase();

		await client.query(`
			UPDATE invoices
			SET customer_id = $1, amount = $2, status = $3
			WHERE id = $4
		`, [customerId, amountInCents, status, id]);

		await client.end();
	} catch (error: any) {
		console.error(error);
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