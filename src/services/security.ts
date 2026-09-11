import pb from '@/lib/pocketbase/client'

export type PermissionCheck = {
  allowed: boolean
  permission: string
}

export const checkPermission = (permission: string) =>
  pb.send<PermissionCheck>('/backend/v1/auth/check-permission', {
    method: 'POST',
    body: JSON.stringify({ permission }),
    headers: { 'Content-Type': 'application/json' },
  })

export const revokeSession = (reason = 'user_requested') =>
  pb.send<{ revoked: boolean }>('/backend/v1/auth/revoke-session', {
    method: 'POST',
    body: JSON.stringify({ reason }),
    headers: { 'Content-Type': 'application/json' },
  })
