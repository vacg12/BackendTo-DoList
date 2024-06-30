const tasksRouter = require('express').Router();
const db = require('../db');
const TASKS_REGEX  = /^(?=.*[a-zA-Z0-9]).{1,}$/;

tasksRouter.post('/', async (req, res) => {
  try {
    // 1. Obtener la tarea del body
    const { texto } = req.body;

    // 1.1 Verificar que la tarea no este vacia
    if (!TASKS_REGEX.test(texto)) {
      return res.status(400).json({
        error: 'La tarea esta vacia',
      });
    }

    // 2. Crear la nueva tarea
    const statement = db.prepare(`
    INSERT INTO tasks (texto, user_id)
    VALUES (?, ?)
    RETURNING *
  `);

    const task = statement.get(texto, req.userId);

    // 4. Enviar la respuesta
    return res.status(201).json(task);
  } catch (error) {
    console.log('ERROR', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'El nombre de usuario ya existe',
      });
    }
    return res.status(500).json({ error: 'Hubo un error' });
  }
});

tasksRouter.put('/:id', async (req, res) => {
  try {
    // 1. Obtener la tarea del body
    const { chequeado } = req.body;

    // 2. Actualizar la tarea
    const statement = db.prepare(`
    UPDATE tasks
    SET 
      chequeado = ?
    WHERE tarea_id = ? AND user_id = ?
    RETURNING *
  `);
    const update = statement.get(chequeado, req.params.id, req.userId);

    if (!update) {
      return res.status(403).json({
        error: 'No tiene los permisos',
      });
    }
    // 4. Enviar la respuesta
    return res.status(200).json(update);
  } catch (error) {
    console.log('ERROR', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'El usuario ya existe',
      });
    }
    return res.status(500).json({ error: 'Hubo un error' });
  }
});

tasksRouter.delete('/:id', async (req, res) => {
  try {
    // borrar la tarea
    const statement = db.prepare(`
   DELETE FROM tasks
   WHERE tarea_id = ? AND user_id = ?
  `);

    const { changes } = statement.run(req.params.id, req.userId);
    if (!changes) {
      return res.status(400).json({
        error: 'El task no existe',
      });
    }

    // 4. Enviar la respuesta
    return res.status(200).json({ message: 'Task eliminado correctamente' });

  } catch (error) {
    console.log('ERROR', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'El usuario ya existe',
      });
    }
  }
});


module.exports = tasksRouter;
