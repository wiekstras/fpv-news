import type { Access, FieldAccess, PayloadRequest } from 'payload'

export const isAdminUser = (req: PayloadRequest) => req.user?.role === 'admin'

export const admins: Access = ({ req }) => isAdminUser(req)
export const adminsField: FieldAccess = ({ req }) => isAdminUser(req)
export const loggedIn: Access = ({ req }) => Boolean(req.user)
export const anyone: Access = () => true

// Admins see everything; other logged-in users only documents they own.
export const adminsOrOwner =
  (ownerField: string): Access =>
  ({ req }) => {
    if (isAdminUser(req)) return true
    if (!req.user) return false
    return { [ownerField]: { equals: req.user.id } }
  }

export const adminsOnly = { read: admins, create: admins, update: admins, delete: admins }

// For `admin.hidden`: keep admin-only collections out of the contributor's admin panel.
export const hiddenFromContributors = ({ user }: { user: any }) => user?.role !== 'admin'
