import IEvents from './interfaces/events'

import { CustomerEvent, InvoiceEvent, PayoutEvent } from './types/stripe'
import { DispatcherInstance } from './types/adapters'
import { GenericMessage, FormattedMessage } from './types/messages'
import { Response } from './types/events'

import { getFormattedDate } from './util/helpers'

class Events implements IEvents {
    /**
     * Instance of Dispatcher.
     *
     * @var {DispatcherInstance}
     */
    private adapter: DispatcherInstance

    /**
     * Constructor.
     *
     * @param {DispatcherInstance} adapter Adapter to use.
     */
    constructor(adapter: DispatcherInstance) {
        this.adapter = adapter
    }

    /**
     * Send webhook payload through adapter.
     *
     * @param {GenericMessage} message The generic message to format.
     * @return {Response}
     */
    protected async send(message: GenericMessage): Promise<Response> {
        const payload: FormattedMessage = this.adapter.format(message)
        return await this.adapter.send(payload)
    }

    /**
     * Handler for 'customer.created' event.
     *
     * @param {CustomerEvent} data Stripe event.
     * @return {Response}
     */
    public async customerCreated(data: CustomerEvent): Promise<Response> {
        const target = {
            message: `:tada: New customer ${data.name} created!`,
        }

        return await this.send(target)
    }

    /**
     * Handler for 'invoice.created' event.
     *
     * @param {InvoiceEvent} data Stripe event.
     * @return {Response}
     */
    public async invoiceCreated(data: InvoiceEvent): Promise<Response> {
        const amount = (data.amount_due / 100) + ' ' + (data.currency || 'USD')

        let status = 'An'

        switch (data.status) {
            case 'draft':
                status = 'A draft'
                break

            case 'open':
                status = 'An open'
                break

            case 'paid':
                status = 'A paid'
                break

            case 'uncollectible':
                status = 'An uncollectible'
                break

            case 'void':
                status = 'A void'
                break

            default:
                break
        }

        const target: GenericMessage = {
            message: `:receipt: ${status} invoice for ${amount} was created!`,
            title: `Invoice ${data.number}`.trim(),
            url: data.hosted_invoice_url,
        }

        return await this.send(target)
    }

    /**
     * Handler for 'payout.created' event.
     *
     * @param {PayoutEvent} data Stripe event.
     * @return {Response}
     */
    public async payoutCreated(data: PayoutEvent): Promise<Response> {
        const amount = (data.amount / 100) + ' ' + (data.currency || 'USD')

        const date = data.arrival_date
            ? 'on ' + getFormattedDate(data.arrival_date)
            : 'in a few days'

        const target: GenericMessage = {
            message: `:moneybag: A payout of ${amount} was created and is expected to arrive ${date}!`
        }

        return await this.send(target)
    }

    /**
     * Handler for 'payout.failed' event.
     *
     * @param {PayoutEvent} data Stripe event.
     * @return {Response}
     */
    public async payoutFailed(data: PayoutEvent): Promise<Response> {
        const amount = (data.amount / 100) + ' ' + (data.currency || 'USD')

        const date = data.arrival_date
            ? 'on ' + getFormattedDate(data.arrival_date)
            : 'in a few days'

        const target: GenericMessage = {
            message: `:sad: The payout of ${amount} that was set to arrive ${date} has failed.`
        }

        return await this.send(target)
    }
}

export default Events