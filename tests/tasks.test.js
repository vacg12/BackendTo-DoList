const supertest = require('supertest');
const app = require('../app');
const { describe, test, expect, beforeAll } = require('@jest/globals');
const db = require('../db');
const api = supertest(app);
let user = undefined;

let tasks = [
  {
   texto: 'Ir al cumple de pepe',
   chequeado: 0,
  },
  {
    texto: 'Cita medico jueves',
    chequeado: 0,
  },
  {
    texto: 'Hacer trabajo',
    chequeado: 0,
  },
];

let users = [
  {
    username: 'tinita12',
    password: 'Hola.123',
  },
  {
    username: 'lolo34',
    password: 'taza.123',
  },
];

describe('test tasks endpoint /api/tareas', () => {
  describe('post /api/tareas', () => {
    beforeAll(() => {
      //Borra todo los usuarios y tareas
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM tasks').run();
      // Crear un usuario
      user = db
        .prepare(
          `
      INSERT INTO users (username, password) VALUES (?, ?) RETURNING *
     `,
        )
        .get('tinita12', 'Secreto.123');
    });
    test('crea una nueva tarea cuando todo esta correcto', async () => {
      //usuario antes de agg, el asterisco significa todo
      const tasksBefore = db.prepare('SELECT * FROM tasks').all;
      const newTask = {
        texto: 'Hacer tarea de programacion',
        chequeado: 0,
      };
      const response = await api
        .post('/api/tareas')
        .query({ userId: user.user_id })
        .send(newTask)
        .expect(201)
        .expect('Content-Type', /json/);
      const tasksAfter = db.prepare('SELECT * FROM tasks').all();
      expect(tasksAfter.length).toBe(tasksBefore.length + 1);
      expect(response.body).toStrictEqual({
        chequeado: 0,
        tarea_id: 1,
        texto: 'Hacer tarea de programacion',
        user_id: 1,
      });
    });
    test('no crea una tarea cuando esta vacio', async () => {
      const tasksBefore = db.prepare('SELECT * FROM tasks').all();
      const newTask = {
        texto: '',
        chequeado: 0,
      };
      const response = await api
        .post('/api/tareas')
        .query({ userId: user.user_id })
        .send(newTask)
        .expect(400)
        .expect('Content-Type', /json/);
      const tasksAfter = db.prepare('SELECT * FROM tasks').all();
      expect(tasksAfter.length).toBe(tasksBefore.length);
      expect(response.body).toStrictEqual({
        error: 'La tarea esta vacia',
      });
    });
    test('no crea una tarea cuando el usuario no existe o no ha iniciado sesion', async () => {
      const tasksBefore = db.prepare('SELECT * FROM tasks').all();
      const newTask = {
        texto: 'Hacer tarea de programacion',
        chequeado: 0,
      };
      await api.post('/api/tareas').query({ userId: null }).send(newTask).expect(403);
      const tasksAfter = db.prepare('SELECT * FROM tasks').all();
      expect(tasksAfter.length).toBe(tasksBefore.length);
    });
  });
  describe('put /api/tareas', () => {
    beforeAll(() => {
      //Borra todo los usuarios y contactos
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM tasks').run();
      // Crear un usuario
      users = users.map((user) => {
        return db
          .prepare(
            `
      INSERT INTO users (username, password)
      VALUES (?, ?)
      RETURNING *
    `,
          )
          .get(user.username, user.password);
      });
      // Crear una tarea
      tasks = tasks.map((task) => {
        return db
          .prepare(
            `
      INSERT INTO tasks (texto, chequeado, user_id) VALUES (?, ?, ?) RETURNING *
     `,
          )
          .get(task.texto, task.chequeado, users[0].user_id);
      });
    });
    test('chequea (se actualiza el check) una tarea cuando todo esta correcto', async () => {
      //parametros modificados
      const updatedParams = {
        texto: 'Ir al cumple de pepe',
        chequeado: 1,
      };
      const response = await api
        .put(`/api/tareas/${tasks[0].tarea_id}`)
        .query({ userId: users[0].user_id})
        .send(updatedParams)
        .expect(200)
        .expect('Content-type', /json/);
      //se espera que todo sea igual excepto texto
      expect(response.body).toStrictEqual({
        tarea_id: 1,
        texto: 'Ir al cumple de pepe',
        chequeado: 1,
        user_id: 1,
      });
    });
    test('no chequea cuando no es el usuario (no tiene permiso o no ha iniciado sesion)', async () => {
      const tasksBefore = db.prepare('SELECT * FROM tasks').all();
      const task = {
        texto: 'Ir al cumple de pepe',
        chequeado: 0,
      };
      await api.post('/api/tareas').query({ userId: null }).send(task).expect(403);
      const tasksAfter = db.prepare('SELECT * FROM tasks').all();
      expect(tasksAfter.length).toBe(tasksBefore.length);
    });
    });
    describe('delete', () => {
      beforeAll(() => {
        //Borra todo los usuarios y contactos
        db.prepare('DELETE FROM users').run();
        db.prepare('DELETE FROM tasks').run();
        // Crear un usuario
        users = users.map((user) => {
          return db
            .prepare(
              `
        INSERT INTO users (username, password)
        VALUES (?, ?)
        RETURNING *
      `,
            )
            .get(user.username, user.password);
        });
        // Crear una tarea
        tasks = tasks.map((task) => {
          return db
            .prepare(
              `
        INSERT INTO tasks (texto, chequeado, user_id) VALUES (?, ?, ?) RETURNING *
       `,
            )
            .get(task.texto, task.chequeado, users[0].user_id);
        });
      });
      test('elimina una tarea', async () => {
        const task = tasks[0];
  
        const response = await api
          .delete(`/api/tareas/${task.tarea_id}`)
          .query({ userId: users[0].user_id })
          .expect(200)
          .expect('Content-type', /json/);
  
         expect(response.body).toStrictEqual({
          message: 'Task eliminado correctamente',
        });
      });
      test('no elimina una tarea cuando el contacto no existe', async () => {
        const response = await api
          .delete(`/api/tareas/1000`)
          .query({ userId: users[0].user_id })
          .expect(400)
          .expect('Content-type', /json/);
  
        expect(response.body).toStrictEqual({
          error: 'El task no existe',
        });
      });
       test('no elimina una tarea cuando no es del usuario', async () => {
      const response = await api
        .delete(`/api/tareas/${tasks[1].tarea_id}`)
        .query({ userId: users[1].user_id })
        .expect(400)
        .expect('Content-type', /json/);

      expect(response.body).toStrictEqual({
        error: 'El task no existe',
      });
    });
  });
 });
