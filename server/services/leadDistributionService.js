const roundRobinAssignments = (items, assignees) => {
  if (!assignees.length) return [];
  return items.map((item, index) => ({ item, assignee: assignees[index % assignees.length] }));
};

module.exports = { roundRobinAssignments };