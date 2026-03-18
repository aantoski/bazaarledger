export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      animal_products: {
        Row: {
          animal_id: number | null
          animal_name: string | null
          id: number
          item_id: number | null
          item_name: string | null
        }
        Insert: {
          animal_id?: number | null
          animal_name?: string | null
          id?: number
          item_id?: number | null
          item_name?: string | null
        }
        Update: {
          animal_id?: number | null
          animal_name?: string | null
          id?: number
          item_id?: number | null
          item_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_products_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      crop_details: {
        Row: {
          days_to_grow: number | null
          id: number
          item_id: number | null
          item_name: string | null
          regrows: boolean | null
          yield: number | null
        }
        Insert: {
          days_to_grow?: number | null
          id?: number
          item_id?: number | null
          item_name?: string | null
          regrows?: boolean | null
          yield?: number | null
        }
        Update: {
          days_to_grow?: number | null
          id?: number
          item_id?: number | null
          item_name?: string | null
          regrows?: boolean | null
          yield?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_details_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_seasons: {
        Row: {
          id: number
          item_id: number | null
          item_name: string | null
          season: string | null
        }
        Insert: {
          id?: number
          item_id?: number | null
          item_name?: string | null
          season?: string | null
        }
        Update: {
          id?: number
          item_id?: number | null
          item_name?: string | null
          season?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_seasons_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_types: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          base_item_id: number | null
          base_item_name: string | null
          buy_price: number | null
          id: number
          is_crop_variant: boolean | null
          item_type: string | null
          item_type_id: number | null
          name: string
          sell_price: number | null
        }
        Insert: {
          base_item_id?: number | null
          base_item_name?: string | null
          buy_price?: number | null
          id?: number
          is_crop_variant?: boolean | null
          item_type?: string | null
          item_type_id?: number | null
          name: string
          sell_price?: number | null
        }
        Update: {
          base_item_id?: number | null
          base_item_name?: string | null
          buy_price?: number | null
          id?: number
          is_crop_variant?: boolean | null
          item_type?: string | null
          item_type_id?: number | null
          name?: string
          sell_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_base_item_id_fkey"
            columns: ["base_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          color: string | null
          id: number
          name: string
        }
        Insert: {
          color?: string | null
          id?: number
          name: string
        }
        Update: {
          color?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      pantry_variants: {
        Row: {
          display_name: string | null
          id: number
          processed_good_id: number | null
          raw_item_id: number | null
        }
        Insert: {
          display_name?: string | null
          id?: number
          processed_good_id?: number | null
          raw_item_id?: number | null
        }
        Update: {
          display_name?: string | null
          id?: number
          processed_good_id?: number | null
          raw_item_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pantry_variants_processed_good_id_fkey"
            columns: ["processed_good_id"]
            isOneToOne: false
            referencedRelation: "processed_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pantry_variants_raw_item_id_fkey"
            columns: ["raw_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_goods: {
        Row: {
          id: number
          machine_color: string | null
          machine_id: number | null
          name: string
          processing_time: string | null
          requires_wonderstone: boolean | null
          sell_price: number | null
        }
        Insert: {
          id?: number
          machine_color?: string | null
          machine_id?: number | null
          name: string
          processing_time?: string | null
          requires_wonderstone?: boolean | null
          sell_price?: number | null
        }
        Update: {
          id?: number
          machine_color?: string | null
          machine_id?: number | null
          name?: string
          processing_time?: string | null
          requires_wonderstone?: boolean | null
          sell_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_goods_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_materials: {
        Row: {
          id: number
          ingredient_group: number | null
          input_good_id: number | null
          input_good_name: string | null
          input_recipe_id: number | null
          input_recipe_name: string | null
          item_id: number | null
          item_name: string | null
          processed_good_id: number | null
          processed_good_name: string | null
          quantity: number | null
        }
        Insert: {
          id?: number
          ingredient_group?: number | null
          input_good_id?: number | null
          input_good_name?: string | null
          input_recipe_id?: number | null
          input_recipe_name?: string | null
          item_id?: number | null
          item_name?: string | null
          processed_good_id?: number | null
          processed_good_name?: string | null
          quantity?: number | null
        }
        Update: {
          id?: number
          ingredient_group?: number | null
          input_good_id?: number | null
          input_good_name?: string | null
          input_recipe_id?: number | null
          input_recipe_name?: string | null
          item_id?: number | null
          item_name?: string | null
          processed_good_id?: number | null
          processed_good_name?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pgi_input_recipe"
            columns: ["input_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_good_ingredients_input_good_id_fkey"
            columns: ["input_good_id"]
            isOneToOne: false
            referencedRelation: "processed_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_good_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_good_ingredients_processed_good_id_fkey"
            columns: ["processed_good_id"]
            isOneToOne: false
            referencedRelation: "processed_goods"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasable_goods: {
        Row: {
          buy_price: number
          id: number
          item_id: number | null
          processed_good_id: number | null
          where_to_buy: string | null
        }
        Insert: {
          buy_price: number
          id?: number
          item_id?: number | null
          processed_good_id?: number | null
          where_to_buy?: string | null
        }
        Update: {
          buy_price?: number
          id?: number
          item_id?: number | null
          processed_good_id?: number | null
          where_to_buy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchasable_goods_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchasable_goods_processed_good_id_fkey"
            columns: ["processed_good_id"]
            isOneToOne: false
            referencedRelation: "processed_goods"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_addons: {
        Row: {
          addon_id: number | null
          addon_name: string | null
          id: number
          recipe_id: number | null
          recipe_name: string | null
        }
        Insert: {
          addon_id?: number | null
          addon_name?: string | null
          id?: number
          recipe_id?: number | null
          recipe_name?: string | null
        }
        Update: {
          addon_id?: number | null
          addon_name?: string | null
          id?: number
          recipe_id?: number | null
          recipe_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_addons_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: number
          ingredient_group: number | null
          input_good_id: number | null
          input_good_name: string | null
          input_recipe_id: number | null
          input_recipe_name: string | null
          item_id: number | null
          item_name: string | null
          quantity: number | null
          recipe_id: number | null
          recipe_name: string | null
        }
        Insert: {
          id?: number
          ingredient_group?: number | null
          input_good_id?: number | null
          input_good_name?: string | null
          input_recipe_id?: number | null
          input_recipe_name?: string | null
          item_id?: number | null
          item_name?: string | null
          quantity?: number | null
          recipe_id?: number | null
          recipe_name?: string | null
        }
        Update: {
          id?: number
          ingredient_group?: number | null
          input_good_id?: number | null
          input_good_name?: string | null
          input_recipe_id?: number | null
          input_recipe_name?: string | null
          item_id?: number | null
          item_name?: string | null
          quantity?: number | null
          recipe_id?: number | null
          recipe_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_input_good_id_fkey"
            columns: ["input_good_id"]
            isOneToOne: false
            referencedRelation: "processed_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_input_recipe_id_fkey"
            columns: ["input_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string | null
          effect: string | null
          id: number
          name: string
          sell_price: number | null
          utensil: string | null
          utensil_id: number | null
          where_to_get: string | null
        }
        Insert: {
          category?: string | null
          effect?: string | null
          id?: number
          name: string
          sell_price?: number | null
          utensil?: string | null
          utensil_id?: number | null
          where_to_get?: string | null
        }
        Update: {
          category?: string | null
          effect?: string | null
          id?: number
          name?: string
          sell_price?: number | null
          utensil?: string | null
          utensil_id?: number | null
          where_to_get?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_utensil_id_fkey"
            columns: ["utensil_id"]
            isOneToOne: false
            referencedRelation: "utensils"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_requirements: {
        Row: {
          id: number
          item_id: number | null
          item_name: string | null
          min_level: number | null
          tool: string | null
        }
        Insert: {
          id?: number
          item_id?: number | null
          item_name?: string | null
          min_level?: number | null
          tool?: string | null
        }
        Update: {
          id?: number
          item_id?: number | null
          item_name?: string | null
          min_level?: number | null
          tool?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_requirements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      utensils: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
