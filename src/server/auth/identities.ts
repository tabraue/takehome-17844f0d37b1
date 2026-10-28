import 'server-only'
import identitiesFile from '../../../data/identidades.json'
import { identitiesFileSchema, type Identity } from '@/server/schemas/identity'

const { identities } = identitiesFileSchema.parse(identitiesFile)

const identitiesByToken = new Map(identities.map((identity) => [identity.token, identity]))

export const listIdentities = (): Identity[] => identities

export const findIdentityByToken = (token: string): Identity | undefined => {
  return identitiesByToken.get(token)
}
