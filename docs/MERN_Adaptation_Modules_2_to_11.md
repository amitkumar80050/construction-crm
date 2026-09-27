# MERN Adaptation for Modules 2 to 11

This document corrects the pasted enterprise blueprint to fit the current MERN stack used in this project:

- Frontend: React + React Router + Context API / Axios
- Backend: Node.js + Express.js + MongoDB + Mongoose
- Auth: JWT with role-based access control
- Existing patterns in this repo: `User`, `Team`, `Client`, `Stage`, `Remark`, `Reminder`, `Activity`, `Import/Export`, `Settings`

The original design was written in a Java/Spring style. This version converts it into a MongoDB + Express + React implementation that matches the current project structure.

---

## 1) Team and Role Management (Module 2)

### Correct MERN structure

#### Models

```js
// server/models/Team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, trim: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Team', teamSchema);
```

```js
// server/models/User.js
teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
role: {
  type: String,
  enum: ['admin', 'manager', 'telecaller', 'sales executer'],
  default: 'telecaller',
},
```

This matches the current repository pattern already used by the app.

### MERN API routes

```js
// server/routes/teamRoutes.js
router.get('/', protect, teamController.getTeams);
router.post('/', protect, admin, teamController.createTeam);
router.put('/:id', protect, admin, teamController.updateTeam);
router.delete('/:id', protect, admin, teamController.deleteTeam);
router.get('/members/:teamId', protect, managerOrAdmin, teamController.getTeamMembers);
```

### Access rules

- Admin: can create, update, delete, and list all teams
- Manager: can view and edit users in own team
- Telecaller / Sales Exec: no team-management rights
- Team membership is enforced in service logic using teamIds

### Frontend pages

- `AdminTeams.jsx`
- `AdminUsers.jsx`
- `ManagerTeam.jsx`

### Validation

- Team name unique
- Manager must exist and have role `manager`
- Team delete should be prevented when it still contains users

---

## 2) Lead Management (Module 3)

### Correct MERN model

The project already uses `Client` as the lead entity, with stage support:

```js
// server/models/Client.js
pipelineStage: {
  type: String,
  enum: ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'],
  default: 'NEW',
},
followUpDate: { type: Date },
assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
```

This maps naturally to the lead pipeline described in the pasted spec.

### Lead stages

```js
const PIPELINE = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];
```

This is already implemented in the repository through:

- [construction-crm/server/services/leadStageService.js](../server/services/leadStageService.js)
- [construction-crm/server/controllers/leadController.js](../server/controllers/leadController.js)

### MERN API routes

```js
router.get('/', protect, leadController.getLeads);
router.get('/:id', protect, leadController.getLeadDetails);
router.patch('/:id/stage', protect, leadController.changeStage);
router.post('/distribute', protect, leadController.distributeLeads);
```

### Business rules

- Telecaller can move leads up to `SITE_VISIT_PLANNED`
- Manager can assign and approve stage progression as needed
- Sales exec handles visits and later stages
- Stage movement must be sequential, not a direct jump
- Notes are required for stage transitions
- Duplicate detection should check phone/email before import

### Import flow

This is the correct MERN version of CSV import:

- Upload file in frontend
- Server reads CSV in `server/scripts/importFromFile.js`
- Compare against existing leads by phone/email
- Skip duplicates or merge them
- Return summary: `{ imported, duplicates, rejected }`

### Frontend pages

- `LeadList.jsx`
- `LeadCard.jsx`
- `LeadForm.jsx`
- `LeadStageModal.jsx`
- `LeadImport.jsx`

---

## 3) Manager Workflow (Module 4)

### MERN equivalent

Manager actions map to existing Express controllers and user/team logic.

#### Features

- Team dashboard metrics
- Lead distribution to telecallers
- Site visit assignment to sales executives
- Attendance approval

### Suggested route structure

```js
// server/routes/managerRoutes.js
router.get('/dashboard', protect, managerOrAdmin, managerController.getDashboard);
router.post('/distribute', protect, manager, managerController.distributeLeadsToTeam);
router.post('/assign-visit', protect, manager, managerController.assignVisit);
router.get('/attendance', protect, managerOrAdmin, managerController.getPendingAttendance);
router.put('/attendance/:id', protect, manager, managerController.updateAttendanceStatus);
```

### Models

```js
// server/models/SiteVisit.js
const siteVisitSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  scheduledAt: { type: Date, required: true },
  address: { type: String, required: true },
  notes: { type: String },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PLANNED', 'DONE', 'MISSED'], default: 'PLANNED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
```

```js
// server/models/Attendance.js
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerRemarks: { type: String },
});
```

### Frontend

- `ManagerDashboard.jsx`
- `LeadDistribution.jsx`
- `SiteVisitModal.jsx`
- `AttendanceApproval.jsx`

---

## 4) Telecaller Workflow (Module 5)

### MERN equivalent

This is implemented by the existing lead workflow with role-based restrictions.

#### Access

- Telecaller can only see leads assigned to them
- Can only move stages up to `SITE_VISIT_PLANNED`
- Can add notes and follow-up dates

### API pattern

```js
router.get('/my', protect, leadController.getMyLeads);
router.patch('/:id/stage', protect, leadController.changeStage);
router.post('/:id/notes', protect, remarkController.addLeadNote);
```

### Frontend

- `TelecallerDashboard.jsx`
- `LeadPipelineBoard.jsx`
- `CallLogPanel.jsx`

### Validation

- Notes required on every stage change
- Cannot mark final visit done directly
- Follow-up date required when moving to `FOLLOW_UP`

---

## 5) Sales Executive Workflow (Module 6)

### MERN equivalent

This maps to a `SiteVisit` collection plus a media upload flow.

#### Model

```js
// server/models/SiteVisitMedia.js
const siteVisitMediaSchema = new mongoose.Schema({
  siteVisitId: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit', required: true },
  type: { type: String, enum: ['PHOTO', 'SIGNATURE'], default: 'PHOTO' },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  latitude: { type: Number },
  longitude: { type: Number },
  address: { type: String },
});
```

#### API routes

```js
router.get('/my', protect, siteVisitController.getMyVisits);
router.get('/:id', protect, siteVisitController.getVisitDetail);
router.post('/:id/complete', protect, siteVisitController.completeVisit);
router.post('/:id/not-done', protect, siteVisitController.markNotDone);
```

### File upload

Use the current project’s upload model patterns with a storage service like:

- local uploads folder
- Cloudinary or MinIO
- Express multipart handling using `multer`

### Frontend

- `MyVisitsPage.jsx`
- `VisitDetailPage.jsx`
- `VisitCompletionModal.jsx`

### Validation

- Only assigned executive can complete a visit
- Photo is required for completion
- GPS can be optional if user denies permissions
- Not-done requires a reason and optional reschedule date

---

## 6) Attendance Approval (Module 7)

### MERN equivalent

This is already aligned with the existing project’s pattern and should be stored in a new `Attendance` model.

#### API routes

```js
router.post('/checkin', protect, attendanceController.checkIn);
router.post('/checkout', protect, attendanceController.checkOut);
router.get('/pending', protect, managerOrAdmin, attendanceController.getPendingAttendance);
router.put('/:id/approve', protect, manager, attendanceController.approveAttendance);
router.put('/:id/reject', protect, manager, attendanceController.rejectAttendance);
```

### Rules

- One check-in per user per day
- Manager can approve only team members
- Admin sees all attendance
- Attendance records are pending by default

### Frontend

- `AttendancePage.jsx`
- `MarkAttendanceButton.jsx`
- `AttendanceApprovalPanel.jsx`

---

## 7) Internal Chat Service (Module 8)

### MERN equivalent

This is implemented using Socket.IO in Express instead of Java WebSocket/STOMP.

#### Models

```js
// server/models/ChatChannel.js
const chatChannelSchema = new mongoose.Schema({
  type: { type: String, enum: ['TEAM', 'PRIVATE', 'BROADCAST'], required: true },
  name: { type: String },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});
```

```js
// server/models/ChatMessage.js
const chatMessageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatChannel', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{ type: String }],
  sentAt: { type: Date, default: Date.now },
});
```

### Real-time sync

Use Socket.IO server in Express:

```js
// server/sockets/index.js
io.on('connection', (socket) => {
  socket.on('join-channel', ({ channelId }) => {
    socket.join(channelId);
  });

  socket.on('send-message', async (payload) => {
    // save message to Mongo
    // emit to channel room
  });
});
```

### Frontend

- `ChatPanel.jsx`
- `MessageInput.jsx`
- `MessageBubble.jsx`

### Validation

- Only members of the channel can send messages
- Broadcast allowed for admin only
- File attachments should be stored and linked to message

---

## 8) Notification Service (Module 9)

### MERN equivalent

In this codebase, notifications can be stored as Mongo documents and delivered by real-time socket events or polling.

#### Model

```js
// server/models/Notification.js
const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
  relatedEntityModel: { type: String },
  createdAt: { type: Date, default: Date.now },
});
```

### Trigger events

When these events happen:

- lead assigned
- site visit assigned
- attendance status changed
- lead moved to next stage
- user created

Generate a notification document and emit a socket push to the recipient.

### Frontend

- Notification bell icon in navbar
- `NotificationDropdown.jsx`
- `NotificationBadge.jsx`

### API routes

```js
router.get('/', protect, notificationController.getNotifications);
router.put('/:id/read', protect, notificationController.markRead);
```

---

## 9) Analytics & Reports (Module 10)

### MERN equivalent

This repo already has analytics support through `analyticsRoutes` and `analyticsService` style patterns.

#### API routes

```js
router.get('/kpi', protect, analyticsController.getKpi);
router.get('/funnel', protect, analyticsController.getFunnelData);
router.get('/export', protect, analyticsController.exportReport);
```

### Data sources

Use Mongo aggregation pipelines on:

- `Client` for lead counts and conversion rate
- `User` for team performance
- `Attendance` for attendance stats
- `SiteVisit` for completed and missed visits

### Frontend

- `Dashboard.jsx`
- `AnalyticsCharts.jsx`
- `ReportsPage.jsx`

### Example pipeline

```js
const result = await Client.aggregate([
  { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
  { $group: { _id: '$pipelineStage', count: { $sum: 1 } } },
]);
```

---

## 10) Logging & Audit (Module 11)

### MERN equivalent

This project already includes an activity log concept and can support audit logging with either:

- a dedicated `Activity` collection
- or MongoDB change tracking via a `AuditLog` collection

#### Existing pattern

```js
// server/models/Activity.js
const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String },
  module: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});
```

This is already used in the lead controller and activity logic.

### Log events

- User login
- User created / updated
- Lead created / moved / assigned
- Team change
- Attendance approval
- Site visit completion

### UI

- `ActivityLogPage.jsx`
- admin-only filter panel

---

## 11) Mongoose / Express patterns used in this project

The current repo already follows these conventions:

- `controllers/*Controller.js`
- `routes/*Routes.js`
- `models/*Model.js`
- `services/*Service.js`
- JWT protected routes via `protect`, `admin`, `manager`
- role checks in service layer and middleware

This is the correct MERN style for the project and should be used instead of the Java/Spring-specific names from the pasted document.

---

## 12) Recommended MERN implementation order

1. Team and role setup
2. User manager and team assignment
3. Lead pipeline and stage validation
4. Manager dashboard and distribution
5. Telecaller workflow
6. Sales visit workflow
7. Attendance approval flow
8. Chat channels and messages
9. Notification system
10. Analytics and exports
11. Audit log viewer
12. QA and deployment

---

## 13) Final note

The original pasted specification is a strong feature blueprint, but it must be adapted to the actual project stack. In this repository, the correct MERN equivalents are:

- `User` for roles and permissions
- `Team` for team grouping
- `Client` for leads
- `Remark` for notes
- `Stage` for pipeline progression
- `Activity` for audit trails
- `Attendance` and `SiteVisit` for work tracking
- Socket.IO for real-time chat and live notifications
- Mongo aggregation for analytics

This gives a clean Node.js + Express.js + MongoDB + React implementation that matches the current app architecture.

## 14) Implemented event notifications and deployment

The current implementation adds a persisted `Notification` collection and delivers `notification:new` over the authenticated Socket.IO connection. Users may only list or mark read their own notifications. Event records are created for lead assignments, site-visit assignments and outcomes, and attendance decisions. See [API_Documentation.md](API_Documentation.md) for the live HTTP contract.

The production deployment is defined by the root `docker-compose.yml`, API and React Dockerfiles, and Nginx configuration. It includes MongoDB, persistent database/uploads/WhatsApp-session/certificate volumes, same-origin `/api` routing, Socket.IO upgrade proxying, and Certbot bootstrap/renewal. See [Deployment.md](Deployment.md) for the host prerequisites and rollout steps.

### Verification commands

Run the server tests and production client build from the repository root:

```sh
npm test --prefix server
npm run build --prefix client
docker compose config --quiet
```

The controller tests cover duplicate check-in prevention, manager team scope, required rejection reasons, and notification recipient isolation. Add focused tests alongside each module as new event types or access rules are introduced.

## 15) Team and role management implementation notes

`User.role` is the authorization source of truth and uses `admin`, `manager`, `telecaller`, and `sales executer`. The legacy `Role` collection is not consulted by current middleware. Team membership uses `User.teamIds`; `Team.teamLead` identifies the single lead for each team, and create/update keeps that Manager linked to the team membership used by manager-scoped queries.

Admin team management supports create, edit, member assignment, and deletion only when empty. Managers can view and update basic information for their own Telecallers and Sales Executives, but cannot change roles, permissions, email, or team membership. The manager roster is available at `/manager/team`. Authorization and manager-link synchronization tests run with `npm test --prefix server`.
