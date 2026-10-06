// Generated from the supplied 2026-10-06 audit and phase 3/origin/trait SQL contracts.
// MCA tables only; not a full-project Supabase CLI export.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {
creature_abilities: {
Row: {
id: number;
creature_id: number;
ability_name: string;
ability_description: string | null;
created_at: string;
};
Insert: {
id?: number;
creature_id: number;
ability_name: string;
ability_description?: string | null;
created_at?: string;
};
Update: {
id?: number;
creature_id?: number;
ability_name?: string;
ability_description?: string | null;
created_at?: string;
};
Relationships: [{"foreignKeyName":"creature_abilities_creature_id_fkey","columns":["creature_id"],"isOneToOne":false,"referencedRelation":"creatures","referencedColumns":["id"]}];
};
creatures: {
Row: {
id: number;
creature_code: string | null;
name: string;
species: string;
universe: string;
galaxy: string | null;
planet: string;
world: string | null;
age: string | null;
size: string | null;
element: string | null;
rarity: string | null;
power_source: string | null;
proposed_threat_level: string;
verified_threat_level: string | null;
description: string;
appearance: string | null;
weaknesses: string;
limitations: string | null;
strongest_ability_condition: string | null;
image_url: string | null;
status: string;
created_at: string;
updated_at: string;
creator_id: string | null;
nebula: string | null;
star_system: string | null;
origin_planet_id: string | null;
traits_version: number | null;
species_term_id: string | null;
species_name: string | null;
element_codes: string[] | null;
element_names: string[] | null;
dimensions: Json | null;
};
Insert: {
id?: number;
creature_code?: string | null;
name: string;
species: string;
universe: string;
galaxy?: string | null;
planet: string;
world?: string | null;
age?: string | null;
size?: string | null;
element?: string | null;
rarity?: string | null;
power_source?: string | null;
proposed_threat_level: string;
verified_threat_level?: string | null;
description: string;
appearance?: string | null;
weaknesses: string;
limitations?: string | null;
strongest_ability_condition?: string | null;
image_url?: string | null;
status?: string;
created_at?: string;
updated_at?: string;
creator_id?: string | null;
nebula?: string | null;
star_system?: string | null;
origin_planet_id?: string | null;
traits_version?: number | null;
species_term_id?: string | null;
species_name?: string | null;
element_codes?: string[] | null;
element_names?: string[] | null;
dimensions?: Json | null;
};
Update: {
id?: number;
creature_code?: string | null;
name?: string;
species?: string;
universe?: string;
galaxy?: string | null;
planet?: string;
world?: string | null;
age?: string | null;
size?: string | null;
element?: string | null;
rarity?: string | null;
power_source?: string | null;
proposed_threat_level?: string;
verified_threat_level?: string | null;
description?: string;
appearance?: string | null;
weaknesses?: string;
limitations?: string | null;
strongest_ability_condition?: string | null;
image_url?: string | null;
status?: string;
created_at?: string;
updated_at?: string;
creator_id?: string | null;
nebula?: string | null;
star_system?: string | null;
origin_planet_id?: string | null;
traits_version?: number | null;
species_term_id?: string | null;
species_name?: string | null;
element_codes?: string[] | null;
element_names?: string[] | null;
dimensions?: Json | null;
};
Relationships: [{"foreignKeyName":"creatures_creator_id_fkey","columns":["creator_id"],"isOneToOne":false,"referencedRelation":"users","referencedColumns":["id"]},{"foreignKeyName":"creatures_origin_planet_id_fkey","columns":["origin_planet_id"],"isOneToOne":false,"referencedRelation":"origin_locations","referencedColumns":["id"]},{"foreignKeyName":"creatures_species_term_id_fkey","columns":["species_term_id"],"isOneToOne":false,"referencedRelation":"creature_terms","referencedColumns":["id"]}];
};
profiles: {
Row: {
id: string;
username: string;
avatar_url: string | null;
role: string;
investigator_level: string;
reputation: number;
created_at: string;
updated_at: string;
};
Insert: {
id: string;
username: string;
avatar_url?: string | null;
role?: string;
investigator_level?: string;
reputation?: number;
created_at?: string;
updated_at?: string;
};
Update: {
id?: string;
username?: string;
avatar_url?: string | null;
role?: string;
investigator_level?: string;
reputation?: number;
created_at?: string;
updated_at?: string;
};
Relationships: [{"foreignKeyName":"profiles_id_fkey","columns":["id"],"isOneToOne":true,"referencedRelation":"users","referencedColumns":["id"]}];
};
origin_locations: {
Row: {
id: string;
kind: string;
name: string;
parent_id: string | null;
status: string;
review_note: string | null;
created_by: string | null;
created_at: string;
};
Insert: {
id?: string;
kind: string;
name: string;
parent_id?: string | null;
status?: string;
review_note?: string | null;
created_by?: string | null;
created_at?: string;
};
Update: {
id?: string;
kind?: string;
name?: string;
parent_id?: string | null;
status?: string;
review_note?: string | null;
created_by?: string | null;
created_at?: string;
};
Relationships: [{"foreignKeyName":"origin_locations_parent_id_fkey","columns":["parent_id"],"isOneToOne":false,"referencedRelation":"origin_locations","referencedColumns":["id"]}];
};
creature_favorites: {
Row: {
user_id: string;
creature_id: number;
created_at: string;
};
Insert: {
user_id: string;
creature_id: number;
created_at?: string;
};
Update: {
user_id?: string;
creature_id?: number;
created_at?: string;
};
Relationships: [{"foreignKeyName":"creature_favorites_creature_id_fkey","columns":["creature_id"],"isOneToOne":false,"referencedRelation":"creatures","referencedColumns":["id"]}];
};
mca_submission_requests: {
Row: {
user_id: string;
request_id: string;
draft: Json;
image_path: string | null;
creature_id: number | null;
created_at: string;
};
Insert: {
user_id: string;
request_id: string;
draft: Json;
image_path?: string | null;
creature_id?: number | null;
created_at?: string;
};
Update: {
user_id?: string;
request_id?: string;
draft?: Json;
image_path?: string | null;
creature_id?: number | null;
created_at?: string;
};
Relationships: [{"foreignKeyName":"mca_submission_requests_creature_id_fkey","columns":["creature_id"],"isOneToOne":false,"referencedRelation":"creatures","referencedColumns":["id"]}];
};
creature_terms: {
Row: {
id: string;
kind: string;
code: string;
name: string;
status: string;
review_note: string | null;
created_by: string | null;
created_at: string;
};
Insert: {
id?: string;
kind: string;
code: string;
name: string;
status?: string;
review_note?: string | null;
created_by?: string | null;
created_at?: string;
};
Update: {
id?: string;
kind?: string;
code?: string;
name?: string;
status?: string;
review_note?: string | null;
created_by?: string | null;
created_at?: string;
};
Relationships: [];
};
creature_elements: {
Row: {
creature_id: number;
term_id: string;
kind: string;
position: number;
};
Insert: {
creature_id: number;
term_id: string;
kind?: string;
position: number;
};
Update: {
creature_id?: number;
term_id?: string;
kind?: string;
position?: number;
};
Relationships: [{"foreignKeyName":"creature_elements_creature_id_fkey","columns":["creature_id"],"isOneToOne":false,"referencedRelation":"creatures","referencedColumns":["id"]},{"foreignKeyName":"creature_elements_term_id_kind_fkey","columns":["term_id","kind"],"isOneToOne":false,"referencedRelation":"creature_terms","referencedColumns":["id","kind"]}];
};
}; Views: { [_ in never]: never }; Functions: {
is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
admin_review_creature: { Args: { p_creature_id: number; p_status: string; p_verified_threat_level: string | null }; Returns: undefined };
mca_submit_creature: { Args: { p_request_id: string; p_draft: Json; p_image_path?: string | null }; Returns: Json };
mca_submit_creature_with_origin: { Args: { p_request_id: string; p_draft: Json; p_image_path?: string | null }; Returns: Json };
mca_add_origin: { Args: { p_kind: string; p_name: string; p_parent_id?: string | null }; Returns: Json };
mca_review_origin: { Args: { p_id: string; p_status: string; p_note?: string | null }; Returns: undefined };
mca_review_creature: { Args: { p_creature_id: string; p_status: string; p_verified_threat_level?: string | null }; Returns: undefined };
mca_submit_creature_v2: { Args: { p_request_id: string; p_draft: Json; p_image_path?: string | null }; Returns: Json };
mca_add_term: { Args: { p_kind: string; p_name: string }; Returns: Json };
mca_review_term: { Args: { p_id: string; p_status: string; p_note?: string | null }; Returns: undefined };
}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; } };
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
