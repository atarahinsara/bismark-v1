/**
 * BISMARK ERP — Dispatch Service (T-6-01 to T-6-03)
 *
 * Smart technician assignment based on:
 *   - Skill match
 *   - Coverage area
 *   - Availability
 *   - Workload
 *   - SLA urgency
 *   - Distance
 *   - Rating
 *
 * V1.5: Suggest top-3 candidates (manager picks)
 * V2: Auto-assign (configurable)
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export interface DispatchCandidate {
  technicianId: string
  technicianName: string
  score: number
  factors: {
    skillMatch: number
    availability: number
    workload: number
    slaUrgency: number
    rating: number
  }
  currentAssignments: number
  skillLevel: string
}

export interface DispatchRequest {
  serviceRequestId: string
  tenantId: string
}

/**
 * Find candidate technicians for a service request.
 * Returns top-3 candidates sorted by score.
 *
 * T-6-01: Candidate Finder
 */
export async function findCandidateTechnicians(
  req: DispatchRequest,
): Promise<DispatchCandidate[]> {
  const { serviceRequestId, tenantId } = req

  // Get service request details
  const serviceRequest = await db.serviceRequest.findFirst({
    where: { id: serviceRequestId, tenantId, deletedAt: null },
    include: {
      productInstance: {
        select: { productId: true, product: { select: { categoryId: true } } },
      },
    },
  })

  if (!serviceRequest) {
    throw new Error('Service request not found')
  }

  // Step 1: Find all technicians with skills matching the product category
  const productCategoryId = serviceRequest.productInstance?.product?.categoryId
  const skills = await db.technicianSkill.findMany({
    where: {
      tenantId,
      ...(productCategoryId ? { productCategoryId } : {}),
    },
    include: {
      // We need to get the party (technician) info
    },
  })

  // Get unique technician IDs
  const technicianIds = [...new Set(skills.map((s) => s.technicianId))]

  if (technicianIds.length === 0) {
    // Fallback: find all technicians (any skill)
    const allSkills = await db.technicianSkill.findMany({
      where: { tenantId },
      select: { technicianId: true },
    })
    technicianIds.push(...new Set(allSkills.map((s) => s.technicianId)))
  }

  // Step 2: Get technician details + availability + workload
  const technicians = await db.party.findMany({
    where: {
      id: { in: technicianIds },
      tenantId,
      deletedAt: null,
      status: 'active',
    },
    select: {
      id: true,
      displayName: true,
    },
  })

  const candidates: DispatchCandidate[] = []

  for (const tech of technicians) {
    // Get skill
    const skill = skills.find((s) => s.technicianId === tech.id)
    const skillLevel = skill?.skillLevel || 'junior'

    // Check availability (today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const availability = await db.technicianAvailability.findFirst({
      where: {
        tenantId,
        technicianId: tech.id,
        date: today,
        status: 'available',
      },
    })

    // Get current workload (active assignments)
    const activeAssignments = await db.technicianAssignment.count({
      where: {
        tenantId,
        technicianPartyId: tech.id,
        status: 'active',
      },
    })

    // Get performance rating
    const performance = await db.technicianPerformance.findFirst({
      where: { tenantId, technicianId: tech.id },
      select: { customerRating: true },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate scores (0-1 scale)
    const skillMatch = scoreSkillMatch(skillLevel)
    const availabilityScore = availability ? 1.0 : 0.0
    const workloadScore = scoreWorkload(activeAssignments)
    const slaUrgency = scoreSlaUrgency(serviceRequest.priority)
    const rating = performance?.customerRating
      ? Math.min(performance.customerRating / 5.0, 1.0)
      : 0.5 // default neutral

    // Calculate weighted total score
    const score =
      0.30 * slaUrgency +
      0.25 * skillMatch +
      0.15 * availabilityScore +
      0.15 * workloadScore +
      0.15 * rating

    candidates.push({
      technicianId: tech.id,
      technicianName: tech.displayName,
      score: Math.round(score * 100) / 100,
      factors: {
        skillMatch,
        availability: availabilityScore,
        workload: workloadScore,
        slaUrgency,
        rating,
      },
      currentAssignments: activeAssignments,
      skillLevel,
    })
  }

  // Sort by score (descending) and return top 3
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 3)
}

function scoreSkillMatch(level: string): number {
  switch (level) {
    case 'expert': return 1.0
    case 'senior': return 0.8
    case 'intermediate': return 0.6
    case 'junior': return 0.4
    default: return 0.3
  }
}

function scoreWorkload(activeAssignments: number): number {
  // Less workload = higher score
  if (activeAssignments === 0) return 1.0
  if (activeAssignments === 1) return 0.8
  if (activeAssignments === 2) return 0.6
  if (activeAssignments === 3) return 0.4
  return 0.2 // 4+ assignments
}

function scoreSlaUrgency(priority: string): number {
  switch (priority) {
    case 'critical': return 1.0
    case 'urgent': return 0.8
    case 'high': return 0.6
    case 'normal': return 0.4
    case 'low': return 0.2
    default: return 0.4
  }
}

/**
 * Auto-assign the best technician to a service request.
 *
 * T-6-03: Auto-Assign
 *
 * Creates a TechnicianAssignment + emits dispatch.assigned event.
 */
export async function autoAssignTechnician(
  serviceRequestId: string,
  tenantId: string,
  assignedBy: string,
): Promise<{ technicianId: string; assignmentId: string }> {
  const candidates = await findCandidateTechnicians({ serviceRequestId, tenantId })

  if (candidates.length === 0) {
    throw new Error('No candidate technicians available')
  }

  const best = candidates[0]

  // Create assignment
  const assignment = await db.technicianAssignment.create({
    data: {
      tenantId,
      technicianPartyId: best.technicianId,
      serviceOrderId: serviceRequestId,
      assignmentType: 'primary',
      status: 'active',
      assignedBy,
      assignedAt: new Date(),
      notes: `Auto-assigned (score: ${best.score})`,
      metadata: {
        score: best.score,
        factors: best.factors,
        autoAssigned: true,
      },
    },
  })

  // Emit outbox event
  await db.outboxMessage.create({
    data: {
      tenantId,
      aggregateType: 'ServiceRequest',
      aggregateId: serviceRequestId,
      eventType: 'dispatch.assigned',
      eventVersion: '1.0',
      payload: {
        serviceRequestId,
        technicianId: best.technicianId,
        technicianName: best.technicianName,
        score: best.score,
        factors: best.factors,
        autoAssigned: true,
        assignedBy,
      },
      actorId: assignedBy,
      status: 'pending',
    },
  })

  logger.info({
    serviceRequestId,
    technicianId: best.technicianId,
    score: best.score,
    assignedBy,
  }, 'Technician auto-assigned')

  return {
    technicianId: best.technicianId,
    assignmentId: assignment.id,
  }
}
