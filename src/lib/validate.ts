import { z } from 'zod'

const phone = z
  .string()
  .regex(/^[0-9+\-()\s]{7,20}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal(''))

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'\-\.]+$/, 'Name contains invalid characters'),
  email: z.string().email('Enter a valid email address').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
  phone,
  company: z.string().max(100).optional().or(z.literal('')),
})

export const checkoutSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  phone,
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
})

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address').max(254),
  phone,
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long'),
  subscribe: z.boolean().optional(),
})

export const profileSchema = z.object({
  full_name: z.string().min(2).max(100).optional().or(z.literal('')),
  phone,
  address: z.string().max(300).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  zip: z
    .string()
    .regex(/^[0-9\-]{0,10}$/, 'Invalid zip code')
    .optional()
    .or(z.literal('')),
})
