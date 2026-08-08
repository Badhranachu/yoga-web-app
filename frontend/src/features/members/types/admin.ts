export type AdminAccount = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  role: string;
  created_at: string;
};

export type CreateAdminPayload = {
  email: string;
  first_name: string;
  last_name?: string;
  phone_number: string;
  password: string;
  password_confirm: string;
};
