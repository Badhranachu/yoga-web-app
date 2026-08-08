export type InstructorProfile = {
  id: number;
  username: string | null;
  email: string;
  age: number | null;
  role: string;
  photo: string | null;
  bio: string;
  show_on_homepage: boolean;
  created_at: string;
};

export type CreateInstructorPayload = {
  username: string;
  email: string;
  first_name: string;
  phone_number: string;
  age?: number | null;
  password: string;
  password_confirm: string;
};

export type UpdateInstructorPayload = {
  username?: string;
  email?: string;
  age?: number | null;
  password?: string;
  photo?: File | null;
  bio?: string;
  show_on_homepage?: boolean;
};

export type PublicInstructor = {
  id: number;
  name: string | null;
  photo: string | null;
  bio: string;
};
