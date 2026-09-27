const test = require('node:test');
const assert = require('node:assert/strict');
const { createAttendanceController } = require('../controllers/attendanceController');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const controllerFor = ({ records = [], employees = [], notifyAttendanceDecision } = {}) => {
  const Attendance = {
    async create(data) {
      if (records.some((item) => String(item.user) === String(data.user) && item.date === data.date)) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }
      const record = { _id: `attendance-${records.length + 1}`, ...data, status: 'PENDING', async save() {} };
      records.push(record);
      return record;
    },
    async findOne(query) {
      return records.find((item) => String(item.user) === String(query.user) && item.date === query.date) || null;
    },
    async findById(id) {
      return records.find((item) => String(item._id) === String(id)) || null;
    },
  };
  const User = {
    findById(id) {
      return {
        select: async () => employees.find((employee) => String(employee._id) === String(id)) || null,
      };
    },
  };
  const Activity = { create: async () => ({}) };
  return createAttendanceController({ Attendance, User, Activity, notifyAttendanceDecision });
};

test('a user cannot check in twice on the same day', async () => {
  const records = [];
  const controller = controllerFor({ records });
  const req = { user: { id: 'employee-1', role: 'telecaller' } };
  const firstResponse = response();
  const secondResponse = response();

  await controller.checkIn(req, firstResponse);
  await controller.checkIn(req, secondResponse);

  assert.equal(firstResponse.statusCode, 201);
  assert.equal(secondResponse.statusCode, 409);
  assert.equal(records.length, 1);
});

test('a manager approves an attendance record for their team', async () => {
  const record = {
    _id: 'attendance-1',
    user: 'employee-1',
    status: 'PENDING',
    async save() {},
  };
  const controller = controllerFor({
    records: [record],
    employees: [{ _id: 'employee-1', name: 'Employee One', teamIds: ['team-a'] }],
  });
  const res = response();

  await controller.approveAttendance({
    params: { id: record._id },
    body: {},
    user: { id: 'manager-1', role: 'manager', teamIds: ['team-a'] },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(record.status, 'APPROVED');
  assert.equal(record.managerId, 'manager-1');
});

test('a manager cannot approve attendance outside their team', async () => {
  const record = {
    _id: 'attendance-1',
    user: 'employee-1',
    status: 'PENDING',
    async save() {},
  };
  const controller = controllerFor({
    records: [record],
    employees: [{ _id: 'employee-1', name: 'Employee One', teamIds: ['team-b'] }],
  });
  const res = response();

  await controller.approveAttendance({
    params: { id: record._id },
    body: {},
    user: { id: 'manager-1', role: 'manager', teamIds: ['team-a'] },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(record.status, 'PENDING');
});

test('rejecting attendance allows an optional remark and stores it when provided', async () => {
  const record = {
    _id: 'attendance-1',
    user: 'employee-1',
    status: 'PENDING',
    async save() {},
  };
  const controller = controllerFor({
    records: [record],
    employees: [{ _id: 'employee-1', name: 'Employee One', teamIds: ['team-a'] }],
  });
  const req = {
    params: { id: record._id },
    body: {},
    user: { id: 'manager-1', role: 'manager', teamIds: ['team-a'] },
  };
  const missingReason = response();
  await controller.rejectAttendance(req, missingReason);
  assert.equal(missingReason.statusCode, 200);
  assert.equal(record.status, 'REJECTED');
  assert.equal(record.managerRemarks, '');

  record.status = 'PENDING';

  const rejected = response();
  await controller.rejectAttendance({
    ...req,
    body: { reason: 'Missing check-out confirmation.' },
  }, rejected);
  assert.equal(rejected.statusCode, 200);
  assert.equal(record.status, 'REJECTED');
  assert.equal(record.managerRemarks, 'Missing check-out confirmation.');
});