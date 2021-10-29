import dotenv from 'dotenv'
import express from 'express'

import DiscordAdapter from './adapters/discord'

import CustomerHandler from './handlers/customer'
import InvoiceHandler from './handlers/invoice'
import PayoutHandler from './handlers/payout'

import { DispatcherInstance } from './types/adapters'
import { Handler, Response } from './types/events'
import { StripePayload } from './types/stripe'

// Initialize Express
const app = express()

// Configure app for handling JSON and URL encoding
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Import environment variables (if any)
dotenv.config()

// Set default port
app.set('port', process.env.PORT || 3000)

// Define dispatchers and handlers
const dispatchers: DispatcherInstance[] = [
    new DiscordAdapter(),
]

const handlers: Handler = {
    'customer.created': [CustomerHandler, 'created'],
    'invoice.created': [InvoiceHandler, 'created'],
    'invoice.finalized': [InvoiceHandler, 'finalized'],
    'invoice.paid': [InvoiceHandler, 'paid'],
    'invoice.payment_failed': [InvoiceHandler, 'paymentFailed'],
    'invoice.sent': [InvoiceHandler, 'sent'],
    'payout.created': [PayoutHandler, 'created'],
    'payout.paid': [PayoutHandler, 'paid'],
    'payout.failed': [PayoutHandler, 'failed'],
}

// Respond to a health check
app.get('/', (request, response) => {
    return response
        .sendStatus(200)
})

// Register a handler for our custom webhooks
app.post('/webhook', async (request, response) => {
    // Get the payload from Stripe
    const event: StripePayload = request.body
    const handler: keyof Events = handlers[event.type]

    // Set the response content type ahead of time
    response.set('Content-Type', 'application/json')

    try {
        // Loop through our dispatchers and add them to the event handler
        for (const Dispatcher of dispatchers) {
            const [ eventHandler, eventMethod ] = handler
            // TODO Deconstruct event handlers and use them to delegate events to adapter

            // Make sure the event handler has the handler we're looking for
            if (typeof handler === 'string' && eventHandler[handler] instanceof Function) {
                const output: Response = await eventHandler[handler](event.data.object)

                console.log('✅\tSuccess:', output.body)
            } else {
                console.error('❌\tError:', `Handler not found in dispatcher ${Dispatcher.constructor.name}`)
            }

            return response
                .sendStatus(200)
        }
    } catch (error) {
        // If an error occurs, log it and return a 500
        console.error(`❌\tError message: ${error.message}`)

        return response
            .status(500)
            .send(JSON.stringify({ error: error.message }))
    }

    response.sendStatus(200)
})

export default app
