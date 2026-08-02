/**
 * BISMARK ERP — User Notification Service
 *
 * Simple in-app notifications with read/unread tracking.
 * Uses the UserNotification table.
 */

import { db } from '@/lib/db'

export interface CreateNotificationInput {
  tenantId: string
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'system'
  category?: string
  link?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a notification for a user.
 */
export async function createNotification(input: CreateNotificationInput) {
  return db.userNotification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      category: input.category || 'general',
      link: input.link || null,
      metadata: input.metadata || {},
    },
  })
}

/**
 * Get notifications for a user (paginated).
 */
export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options

  return db.userNotification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.userNotification.count({
    where: { userId, readAt: null },
  })
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notif = await db.userNotification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notif) throw new Error('Notification not found')
  if (notif.readAt) return notif

  return db.userNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  const result = await db.userNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return { updated: result.count }
}

/**
 * Delete a notification.
 */
export async function deleteNotification(notificationId: string, userId: string) {
  const notif = await db.userNotification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notif) throw new Error('Notification not found')

  return db.userNotification.delete({
    where: { id: notificationId },
  })
}
