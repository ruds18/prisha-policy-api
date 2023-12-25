import {z} from "zod"
import {t} from '../src/trpc'
import {client} from '../db'
import { TRPCError } from '@trpc/server';

export const appRouter  = t.router({
        /**  GET   */

  /** LOGIN **/

   login : t.procedure
  .input(z.object({
    email: z.string().email(),
    password: z.string()
  }))
  .query(async ({ input }) => {
    const { email, password } = input;

    try {
      const userRes = await client.query(
        `SELECT u.user_id, u.email, u.password, e.role 
         FROM users u
         JOIN employees e ON u.user_id = e.user_id
         WHERE u.email = $1`,
        [email]
      );
      const user = userRes.rows[0];

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (user.password !== password) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      return {
        userId: user.user_id,
        role: user.role
      };
    } catch (err) {
      console.error(err);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Login failed',
      });
    }
  }),

     /** ALL USERS **/

  getAllEmployees: t.procedure.query(async () => {
      try {
        const res = await client.query('SELECT * FROM employees');
        return res.rows;
      } catch (err) {
        console.error(err);
        throw new Error
      }
    }),

 
     /** DEPENDENTS OF A SPECIFIC USER **/

  getAllDependentsOfUser : t.procedure
  .input(z.object({
    userId: z.number()
  }))
  .query(async ({ input }) => {
    const { userId } = input;

    const dependentsRes = await client.query(
      `SELECT d.*
       FROM dependents d
       JOIN employees e ON d.employee_id = e.employee_id
       WHERE e.user_id = $1`,
      [userId]
    );

    return dependentsRes.rows;
  }),

  /**   SPECIFIC EMPLOYEE    **/
    getEmployeeById: t.procedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { userId } = input;
        const employeeRes = await client.query(
          `SELECT e.*
           FROM employees e
           WHERE e.user_id = $1`,
          [userId]
        );
        return employeeRes.rows[0];
      }),

         /**  POST  */

   /**  ADD DEPENDENTS  **/
    addDependents : t.procedure
   .input(z.object({
     employeeId: z.number(),
     name: z.string(),
     dateOfBirth: z.string(),
     relation: z.string()
   }))
   .mutation(async ({ input }) => {
     const { employeeId, name, dateOfBirth, relation } = input;
     const res = await client.query(
       'INSERT INTO dependents (employee_id, name, date_of_birth, relation) VALUES ($1, $2, $3, $4) RETURNING *',
       [employeeId, name, dateOfBirth, relation]
     );
     return res.rows[0];
   }),

     /** ADD EMPLOYEE **/

    addNewEmployee : t.procedure
     .input(z.object({
       newEmployeeDetails: z.object({
         name: z.string(),
         role: z.string(),
         email: z.string().email(),
         designation: z.string(),
         dateOfJoining: z.string(),
         gender: z.string(),
         mobileNumber: z.string(),
         insuranceNumber: z.string().optional()
       })
     }))
     .mutation(async ({ input }) => {
       const { newEmployeeDetails } = input;
   
       const userRes = await client.query(
         'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id', 
         [newEmployeeDetails.email, 'defaultPassword'] 
       );
       const newUser = userRes.rows[0];
   
       const employeeRes = await client.query(
         'INSERT INTO employees (user_id, name, role, designation, date_of_joining, gender, mobile_number, insurance_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
         [newUser.user_id, newEmployeeDetails.name, newEmployeeDetails.role, newEmployeeDetails.designation, newEmployeeDetails.dateOfJoining, newEmployeeDetails.gender, newEmployeeDetails.mobileNumber, newEmployeeDetails.insuranceNumber]
       );
       return employeeRes.rows[0];
     }),

    /** ADD Dependents **/

     addDependent : t.procedure
  .input(z.object({
    employeeId: z.number(),
    name: z.string(),
    dateOfBirth: z.string(),
    relation: z.string()
  }))
  .mutation(async ({ input }) => {
    const { employeeId, name, dateOfBirth, relation } = input;
    const res = await client.query(
      'INSERT INTO dependents (employee_id, name, date_of_birth, relation) VALUES ($1, $2, $3, $4) RETURNING *',
      [employeeId, name, dateOfBirth, relation]
    );
    return res.rows[0];
  }),

        /**  PATCH  **/
  
    /** EDIT DEPENDENTS **/

    editDependent : t.procedure
  .input(z.object({
    dependentId: z.number(),
    name: z.string().optional(),
    dateOfBirth: z.string().optional(),
    relation: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    const { dependentId, name, dateOfBirth, relation } = input;
    const res = await client.query(
      'UPDATE dependents SET name = $1, date_of_birth = $2, relation = $3 WHERE dependent_id = $4 RETURNING *',
      [name, dateOfBirth, relation, dependentId]
    );
    return res.rows[0];
  }),

   /** DELETE **/
   

   deleteUser : t.procedure
  .input(z.object({
    userId: z.number()
  }))
  .mutation(async ({ input }) => {
    const { userId } = input;

    await client.query('BEGIN');

    try {

      await client.query(
        'DELETE FROM dependents WHERE employee_id IN (SELECT employee_id FROM employees WHERE user_id = $1)',
        [userId]
      );

      await client.query(
        'DELETE FROM employees WHERE user_id = $1',
        [userId]
      );

      const userRes = await client.query(
        'SELECT user_id FROM users WHERE user_id = $1',
        [userId]
      );

      if (userRes.rows.length > 0) {
        await client.query(
          'DELETE FROM users WHERE user_id = $1',
          [userId]
        );
      }
      await client.query('COMMIT');
    } catch (error) {

      await client.query('ROLLBACK');
      throw error; 
    }
  }),
  
  })