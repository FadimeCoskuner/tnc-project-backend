const express = require('express');
const taskController = require('../controllers/taskController');
const {
  validateTaskBody,
  validateTaskPatch,
  validateListQuery,
  validateSearchQuery,
} = require('../middleware/validateTask');

const router = express.Router();

router.post('/', validateTaskBody, taskController.createTask);
router.get('/', validateListQuery, taskController.getTasks);

// Sıra önemli: bu ikisi /:id'den önce gelmelidir, yoksa "search" bir id sanılır.
router.get('/search', validateSearchQuery, validateListQuery, taskController.searchTasks);
router.get('/assignee/:assignee', validateListQuery, taskController.getTasksByAssignee);

router.get('/:id', taskController.getTaskById);
router.put('/:id', validateTaskBody, taskController.updateTask);
router.patch('/:id', validateTaskPatch, taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
