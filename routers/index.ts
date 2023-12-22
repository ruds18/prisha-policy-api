import {z} from "zod"
import {t} from '../src/trpc'
import {client} from '../db'
import { TRPCError } from '@trpc/server';

export const appRouter  = t.router({
    getAllEmployees: t.procedure.query(async () => {
      try {
        const res = await client.query('SELECT * FROM Employee');
        return res.rows;
      } catch (err) {
        console.error(err);
        throw new Error
      }
    }),
    getEmployeeById: t.procedure
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ input }) => {
        const { employeeId } = input;
        const res = await client.query('SELECT * FROM Employee WHERE employee_id = $1', [employeeId]);
        return res.rows[0];
      }),
  
    // Example to add a new employee
    addEmployee: t.procedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        department: z.string(),
        position: z.string(),
        insurancePolicyId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { firstName, lastName, email, department, position, insurancePolicyId } = input;
        const res = await client.query(
          'INSERT INTO Employee (first_name, last_name, email, department, position, insurance_policy_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [firstName, lastName, email, department, position, insurancePolicyId]
        );
        return res.rows[0];
      }),
  
    // Example to update an employee's details
    updateEmployee: t.procedure
      .input(z.object({
        employeeId: z.string(),
        email: z.string().optional(),
        department: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { employeeId, email, department } = input;
        const res = await client.query(
          'UPDATE Employee SET email = $2, department = $3 WHERE employee_id = $1 RETURNING *',
          [employeeId, email, department]
        );
        return res.rows[0];
      }),
  
    // Example to delete an employee
    deleteEmployee: t.procedure
      .input(z.object({ employeeId: z.string() }))
      .mutation(async ({ input }) => {
        const { employeeId } = input;
        await client.query('DELETE FROM Employee WHERE employee_id = $1', [employeeId]);
        return { message: "Employee deleted successfully" };
      }),
      
    login: t.procedure
     
    .input(z.object({
      email: z.string(),    // Changed from username to email
      password: z.string(), // Not hashed for this example
    }))
    .query(async ({ input }) => {
      const { email, password } = input;
       console.log(input)
      try {
        // Fetch user details from the database using email
        const userRes = await client.query('SELECT UserAccount.*, Employee.email FROM UserAccount JOIN Employee ON UserAccount.employee_id = Employee.employee_id WHERE Employee.email = $1', [email]);
        const user = userRes.rows[0];
        console.log(user);
  
        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }
  
        // Check if the password matches
        if (user.password_hash !== password) { // Assuming 'password_hash' stores the plain password for this example
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          });
        }
  
        // Fetch the role of the user
        const roleRes = await client.query('SELECT role_name FROM Role WHERE role_id = $1', [user.role_id]);
        const role = roleRes.rows[0].role_name;
  
        return {
          email: email, // Return email instead of username
          role: role,
        };
      } catch (err) {
        console.error(err);
  
        throw new  TRPCError({
          code: 'BAD_REQUEST',
          message: '"password" must be at least 4 characters',
        })
      }
    })
  
  })