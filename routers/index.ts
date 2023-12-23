import {z} from "zod"
import {t} from '../src/trpc'
import {client} from '../db'
import { TRPCError } from '@trpc/server';

export const appRouter  = t.router({
    getAllEmployees: t.procedure.query(async () => {
      try {
        const res = await client.query('SELECT * FROM employees');
        return res.rows;
      } catch (err) {
        console.error(err);
        throw new Error
      }
    }),

    getEmployeeById: t.procedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        const { employeeId } = input;
        const res = await client.query('SELECT * FROM Employee WHERE employee_id = $1', [employeeId]);
        return res.rows[0];
      }),

      getDependentsByEmployee: t.procedure
  .input(z.object({
    employee_id: z.number(), // Input parameter: employee_id
  }))
  .query(async ({ input }) => {
    const { employee_id } = input;

    try {
      const query = `
        SELECT 
          Dependents.dependent_id, 
          Dependents.dependent_full_name, 
          Dependents.date_of_birth, 
          Dependents.gender, 
          Dependents.relationship
        FROM Dependents
        WHERE Dependents.employee_id = $1
      `;
      const res = await client.query(query, [employee_id]);
      return res.rows;
    } catch (err) {
      console.error(err);
      throw new Error('Failed to retrieve dependents for the selected employee');
    }
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
        email: z.string(),
        password: z.string(), // This should be hashed in a real application
      }))
      .query(async ({ input }) => {
        const { email, password } = input;
    
        try {
          // Fetch user details from the database using email
          const userRes = await client.query('SELECT Users.*, Employees.employee_type, InsurancePolicies.policy_name FROM Users JOIN Employees ON Users.user_id = Employees.employee_id LEFT JOIN InsurancePolicies ON Employees.policy_id = InsurancePolicies.policy_id WHERE Users.email = $1', [email]);
          const user = userRes.rows[0];
    
          if (!user) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found',
            });
          }
    
          // Check if the password matches (hashed and salted in a real application)
          if (user.password !== password) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Invalid credentials',
            });
          }
    
          return {
            email: email,
            role: user.employee_type,
            policy_name: user.policy_name,
          };
        } catch (err) {
          console.error(err);
    
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Login failed',
          });
        }
      })
  
  })