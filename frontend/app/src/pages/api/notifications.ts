import { useTranslations, useTranslatedPath } from '@i18n/utils';
import type { User } from '@dtypes/jwt'
import * as jose from 'jose'
import { is_prod_mode } from '@helpers/env'
import { HTTP_404_Not_Found, HTTP_403_Forbidden, HTTP_200_Success, HTTP_500_Server_Error } from '@helpers/http_responses'
import { create_subscription, remove_subscription } from '@helpers/db/notification_subscriptions'

export async function POST({ request, cookies, redirect }) {
    if (request.headers.get("Content-Type") !== "application/json")
        return HTTP_404_Not_Found()

    const subscription = await request.json()
    const lang = 'en'
    const t = useTranslations(lang)

    const auth_token = cookies.has('auth_token') ? cookies.get('auth_token').value : false
    const user:User | false = auth_token ? jose.decodeJwt(auth_token) as User : false

    if (!auth_token || !user) {
        return HTTP_403_Forbidden()
    }

    let subscription_id
    try {
        subscription_id = await create_subscription(user.user_id, subscription)
    } catch (error) {
        console.log(is_prod_mode() ? t('create_subscription_error') : error.message)
    }

    if (!subscription_id)
        return HTTP_404_Not_Found()

    cookies.set('subscription_id', subscription_id, { path: '/' })
    
    return HTTP_200_Success({
        subscription_id: subscription_id
    })
}

export async function DELETE({ cookies }) {
    const lang = 'en'
    const t = useTranslations(lang)
    
    const subscription_id = cookies.has('subscription_id') ? cookies.get('subscription_id').value : null
    let deleted_id

    if (subscription_id) {
        try {
            deleted_id = await remove_subscription(subscription_id)
        } catch (error) {
            console.log(error)

            return HTTP_500_Server_Error({
                error: is_prod_mode() ? t('create_subscription_error') : error.message
            })
        }
    }

    if (deleted_id > 0) {
        cookies.delete('subscription_id', { path: '/' })

        return HTTP_200_Success()
    }

    return HTTP_404_Not_Found()
}