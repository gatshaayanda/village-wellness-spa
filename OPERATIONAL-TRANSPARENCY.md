# Village Wellness Spa — Operational Transparency Standard

## Purpose

Use behavioral-science and service-design evidence to make genuine customer and staff work understandable. The aim is to reduce uncertainty and make service effort, progress and next actions legible—not to manufacture the appearance of work.

## Application rules

1. **Show actual work:** expose only actions supported by persisted application events (for example, request received, staff review, confirmation, check-in and completion).
2. **Explain the next step:** every customer-visible status should answer “what happened?” and “what should I do now?” in concise, neutral language.
3. **Record real timestamps:** write status-update timestamps when an authorized staff member changes a status. Do not fabricate a timeline for older records.
4. **Separate independent facts:** appointment confirmation, payment state, device registration and notification delivery are different facts. Never infer one from another.
5. **Keep agency with the customer:** notification categories remain separately opt-in; no manipulative urgency, shame, artificial scarcity or forced account creation.
6. **Use accurate progress feedback:** do not show fake progress bars, simulated activity or arbitrary waiting. If a workflow is still processing, describe the real operation underway; if it fails, explain the failure and recovery action.
7. **Avoid overload:** surface the status and next step first. Keep secondary detail compact and accessible.
8. **Preserve working systems:** do not change the booking transaction/slot-lock logic, Firebase identity model, Firestore collections, admin authorization, UploadThing, PWA installation lifecycle or chatbot behavior as part of transparency improvements.

## Current implementation

- Booking still checks live availability and validates the selected slot again on submission.
- A newly submitted request remains NEW and is not described as a confirmed appointment.
- Staff status changes now write `statusUpdatedAt` on the booking record.
- The customer booking-history API exposes that timestamp only to the verified customer who owns the record.
- The account shows plain-language next-step guidance for each known status, the real last status-update time when available, and payment state separately.
- Payment labels distinguish unrecorded payment, instructions, submitted proof, verification, paid and refunded states.
- Booking confirmation now links to the actual `#my-visits` section.
- Existing notification preferences and push setup behavior are unchanged. A saved preference or successful push-service response is not represented as guaranteed device delivery.

## QA checklist

- Submit a guest booking and confirm the UI says request received, not appointment confirmed.
- Confirm the booking appears under My visits with the same reference.
- Change the request status through the authorized admin workflow; confirm `statusUpdatedAt` is written and shown in the owning customer's account.
- Confirm a legacy request without `statusUpdatedAt` still renders without an invented date.
- Verify status guidance for NEW, REVIEWING, APPROVED, PAYMENT_PENDING, CONFIRMED, ARRIVED, COMPLETED, NEEDS_CONTACT, DECLINED, RESCHEDULED, CANCELLED, NO_SHOW and FOLLOW_UP.
- Change payment state independently and confirm it does not change appointment status.
- Verify customer A cannot see customer B's booking or status timestamp.
- Verify notification preferences still save independently and that browser permission/device delivery wording remains accurate.
- Retest mobile layout, guest booking, optional Google linking and the protected PWA install/chatbot behavior.

## Research references

- Wang, Peihao, Laurie Wu & Yuan Wang (2025). “Illuminating the unseen: How and why operational transparency mitigates customer dissatisfaction in platform-based services.” *Journal of Business Research*. https://doi.org/10.1016/j.jbusres.2025.115574  
  Mixed-method research reports that visibility into service-delivery processes can reduce dissatisfaction by increasing perceived service effort. Treat this as a design rationale, not a guarantee of an outcome in this spa.
- Conrad, Frederick G., Mick P. Couper, Roger Tourangeau & Annelies Peytchev (2010). “The impact of progress indicators on task completion.” *Interacting with Computers*, 22(5), 417–427. https://doi.org/10.1016/j.intcom.2010.03.001  
  Experiments found progress feedback can help or harm depending on the expectations it creates; inaccurate or discouraging early progress can increase abandonment. Therefore use only accurate, meaningful progress.
- “Wellbeing Supportive Design – Research-Based Guidelines for Supporting Psychological Wellbeing in User Experience” (2022). https://doi.org/10.1080/10447318.2022.2089812  
  Supports informational, non-evaluative feedback about progress and effort, with autonomy-supportive language rather than judgment or pressure.

Research should inform design hypotheses. Evaluate the actual spa experience through customer/staff QA and observed outcomes; do not claim causal business impact without measurement.
