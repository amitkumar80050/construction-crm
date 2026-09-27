const test = require('node:test');
const assert = require('node:assert/strict');
const { createNotificationController } = require('../controllers/notificationController');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('notification list is restricted to the signed-in recipient', async () => {
  let receivedQuery;
  let receivedCountQuery;
  const Notification = {
    find(query) {
      receivedQuery = query;
      return {
        sort() { return this; },
        skip() { return this; },
        limit: async () => [{ _id: 'notification-1', recipient: 'user-1' }],
      };
    },
    countDocuments: async (query) => { receivedCountQuery = query; return 1; },
  };
  const controller = createNotificationController(Notification);
  const res = response();

  await controller.listNotifications({ user: { id: 'user-1' }, query: { unread: 'true' } }, res);

  assert.deepEqual(receivedQuery, { recipient: 'user-1', readAt: { $exists: false } });
  assert.deepEqual(receivedCountQuery, { recipient: 'user-1', readAt: { $exists: false } });
  assert.equal(res.body.data[0].recipient, 'user-1');
  assert.equal(res.body.unreadCount, 1);
});

test('a user cannot mark another user\'s notification as read', async () => {
  let updateFilter;
  const Notification = {
    findOneAndUpdate: async (filter) => {
      updateFilter = filter;
      return null;
    },
  };
  const controller = createNotificationController(Notification);
  const res = response();

  await controller.markRead({ params: { id: 'notification-2' }, user: { id: 'user-1' } }, res);

  assert.deepEqual(updateFilter, { _id: 'notification-2', recipient: 'user-1' });
  assert.equal(res.statusCode, 404);
});

test('mark all read only updates the current user\'s unread notifications', async () => {
  let updateFilter;
  const Notification = {
    updateMany: async (filter) => { updateFilter = filter; },
  };
  const controller = createNotificationController(Notification);
  const res = response();

  await controller.markAllRead({ user: { id: 'user-1' } }, res);

  assert.deepEqual(updateFilter, { recipient: 'user-1', readAt: { $exists: false } });
  assert.equal(res.body.success, true);
});