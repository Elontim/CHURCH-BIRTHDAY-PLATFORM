export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  bio: string | null;
  avatar_url: string | null;
  account_status: "pending" | "active" | "suspended";
  created_at: string;
};

export type Birthday = Pick<Profile, "id" | "full_name" | "date_of_birth" | "avatar_url" | "bio">;

export type Notice = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_read?: boolean;
};

export type RoleName =
  | "general_admin"
  | "admin"
  | "birthday_manager"
  | "event_manager"
  | "content_manager"
  | "member_manager"
  | "notification_manager"
  | "member";
