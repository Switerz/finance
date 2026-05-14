export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          type: "checking" | "savings" | "credit_card" | "cash" | "investment" | "other";
          institution: string | null;
          initial_balance: number;
          current_balance: number;
          credit_limit: number | null;
          closing_day: number | null;
          due_day: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          type: "checking" | "savings" | "credit_card" | "cash" | "investment" | "other";
          institution?: string | null;
          initial_balance?: number;
          current_balance?: number;
          credit_limit?: number | null;
          closing_day?: number | null;
          due_day?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          type?: "checking" | "savings" | "credit_card" | "cash" | "investment" | "other";
          institution?: string | null;
          initial_balance?: number;
          current_balance?: number;
          credit_limit?: number | null;
          closing_day?: number | null;
          due_day?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          type: "income" | "expense" | "investment" | "transfer";
          parent_id: string | null;
          color: string | null;
          icon: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          type: "income" | "expense" | "investment" | "transfer";
          parent_id?: string | null;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          type?: "income" | "expense" | "investment" | "transfer";
          parent_id?: string | null;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_rules: {
        Row: {
          id: string;
          workspace_id: string;
          account_id: string | null;
          category_id: string | null;
          description: string;
          amount: number;
          type: "income" | "expense" | "investment";
          frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date: string;
          end_date: string | null;
          day_of_month: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          account_id?: string | null;
          category_id?: string | null;
          description: string;
          amount: number;
          type: "income" | "expense" | "investment";
          frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date: string;
          end_date?: string | null;
          day_of_month?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          description?: string;
          amount?: number;
          type?: "income" | "expense" | "investment";
          frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
          start_date?: string;
          end_date?: string | null;
          day_of_month?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          workspace_id: string;
          account_id: string | null;
          category_id: string | null;
          description: string;
          amount: number;
          type: "income" | "expense" | "investment" | "transfer";
          transaction_date: string;
          competence_month: string | null;
          payment_method:
            | "pix"
            | "credit_card"
            | "debit_card"
            | "cash"
            | "bank_slip"
            | "transfer"
            | "other"
            | null;
          status: "paid" | "pending" | "scheduled" | "cancelled";
          notes: string | null;
          tags: string[];
          is_recurring: boolean;
          recurring_rule_id: string | null;
          installment_group_id: string | null;
          installment_number: number | null;
          installment_total: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          account_id?: string | null;
          category_id?: string | null;
          description: string;
          amount: number;
          type: "income" | "expense" | "investment" | "transfer";
          transaction_date: string;
          competence_month?: string | null;
          payment_method?:
            | "pix"
            | "credit_card"
            | "debit_card"
            | "cash"
            | "bank_slip"
            | "transfer"
            | "other"
            | null;
          status?: "paid" | "pending" | "scheduled" | "cancelled";
          notes?: string | null;
          tags?: string[];
          is_recurring?: boolean;
          recurring_rule_id?: string | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          installment_total?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          description?: string;
          amount?: number;
          type?: "income" | "expense" | "investment" | "transfer";
          transaction_date?: string;
          competence_month?: string | null;
          payment_method?:
            | "pix"
            | "credit_card"
            | "debit_card"
            | "cash"
            | "bank_slip"
            | "transfer"
            | "other"
            | null;
          status?: "paid" | "pending" | "scheduled" | "cancelled";
          notes?: string | null;
          tags?: string[];
          is_recurring?: boolean;
          recurring_rule_id?: string | null;
          installment_group_id?: string | null;
          installment_number?: number | null;
          installment_total?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          account_id: string | null;
          category_id: string | null;
          name: string;
          amount: number;
          billing_cycle: "monthly" | "quarterly" | "yearly";
          billing_day: number | null;
          next_billing_date: string | null;
          status: "active" | "paused" | "cancelled";
          importance: "essential" | "useful" | "dispensable" | null;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          account_id?: string | null;
          category_id?: string | null;
          name: string;
          amount: number;
          billing_cycle: "monthly" | "quarterly" | "yearly";
          billing_day?: number | null;
          next_billing_date?: string | null;
          status?: "active" | "paused" | "cancelled";
          importance?: "essential" | "useful" | "dispensable" | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          name?: string;
          amount?: number;
          billing_cycle?: "monthly" | "quarterly" | "yearly";
          billing_day?: number | null;
          next_billing_date?: string | null;
          status?: "active" | "paused" | "cancelled";
          importance?: "essential" | "useful" | "dispensable" | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          workspace_id: string;
          category_id: string;
          month: string;
          planned_amount: number;
          alert_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_id: string;
          month: string;
          planned_amount: number;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          category_id?: string;
          month?: string;
          planned_amount?: number;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          monthly_contribution: number | null;
          status: "active" | "completed" | "paused" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          deadline?: string | null;
          monthly_contribution?: number | null;
          status?: "active" | "completed" | "paused" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          deadline?: string | null;
          monthly_contribution?: number | null;
          status?: "active" | "completed" | "paused" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
      };
      imports: {
        Row: {
          id: string;
          workspace_id: string;
          file_name: string | null;
          source: string | null;
          status: "uploaded" | "mapped" | "processed" | "failed";
          total_rows: number | null;
          processed_rows: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          file_name?: string | null;
          source?: string | null;
          status: "uploaded" | "mapped" | "processed" | "failed";
          total_rows?: number | null;
          processed_rows?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          file_name?: string | null;
          source?: string | null;
          status?: "uploaded" | "mapped" | "processed" | "failed";
          total_rows?: number | null;
          processed_rows?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          action: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          action?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          action?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      create_initial_workspace: {
        Args: { workspace_name: string; workspace_currency?: string };
        Returns: string;
      };
      is_workspace_member: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      workspace_role: {
        Args: { target_workspace_id: string };
        Returns: WorkspaceRole | null;
      };
      can_read_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_write_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      can_admin_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      is_workspace_owner: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      shares_workspace_with: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
