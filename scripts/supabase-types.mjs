import {readFile,writeFile} from 'node:fs/promises';
const audit=JSON.parse(await readFile(new URL('../supabase/audits/20261006-before-phase3.json',import.meta.url),'utf8'));
const mapping={int8:'number',int4:'number',text:'string',uuid:'string',timestamptz:'string',jsonb:'Json'};
const tables=audit.tables.map(t=>({name:t.relname,columns:audit.columns.filter(c=>c.table_name===t.relname).sort((a,b)=>a.ordinal_position-b.ordinal_position),relationships:audit.constraints.filter(c=>c.table.replace(/^public\./,'')===t.relname&&c.definition.startsWith('FOREIGN KEY')).map(c=>{
  const m=c.definition.match(/FOREIGN KEY \(([^)]+)\) REFERENCES (?:\w+\.)?(\w+)\(([^)]+)\)/);
  if(!m)throw new Error('Unrecognized foreign key');
  return {foreignKeyName:c.name,columns:m[1].split(',').map(x=>x.trim()),isOneToOne:t.relname==='profiles',referencedRelation:m[2],referencedColumns:m[3].split(',').map(x=>x.trim())};
})}));
const col=(name,type,nullable=false,defaulted=false)=>({column_name:name,udt_name:type,is_nullable:nullable?'YES':'NO',column_default:defaulted?'default':null,is_identity:'NO'});
const creatures=tables.find(t=>t.name==='creatures');
creatures.columns.push(col('nebula','text',true),col('star_system','text',true),col('origin_planet_id','uuid',true));
creatures.relationships.push({foreignKeyName:'creatures_origin_planet_id_fkey',columns:['origin_planet_id'],isOneToOne:false,referencedRelation:'origin_locations',referencedColumns:['id']});
for(const [name,columns] of [
  ['origin_locations',[col('id','uuid',false,true),col('kind','text'),col('name','text'),col('parent_id','uuid',true),col('status','text',false,true),col('review_note','text',true),col('created_by','uuid',true),col('created_at','timestamptz',false,true)]],
  ['creature_favorites',[col('user_id','uuid'),col('creature_id','int8'),col('created_at','timestamptz',false,true)]],
  ['mca_submission_requests',[col('user_id','uuid'),col('request_id','uuid'),col('draft','jsonb'),col('image_path','text',true),col('creature_id','int8',true),col('created_at','timestamptz',false,true)]],
])tables.push({name,columns,relationships:name==='origin_locations'?[{foreignKeyName:'origin_locations_parent_id_fkey',columns:['parent_id'],isOneToOne:false,referencedRelation:'origin_locations',referencedColumns:['id']}]:[{foreignKeyName:`${name}_creature_id_fkey`,columns:['creature_id'],isOneToOne:false,referencedRelation:'creatures',referencedColumns:['id']}]});
let source=`// Generated from the supplied 2026-10-06 audit and phase 3/origin SQL contracts.
// MCA tables only; not a full-project Supabase CLI export.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {\n`;
for(const t of tables){
  source+=`${t.name}: {\n`;
  for(const kind of ['Row','Insert','Update']){
    source+=`${kind}: {\n`;
    for(const c of t.columns){
      if(!mapping[c.udt_name])throw new Error(`Unsupported type ${c.udt_name}`);
      const optional=kind==='Update'||(kind==='Insert'&&(c.is_nullable==='YES'||c.column_default!==null||c.is_identity==='YES'));
      source+=`${c.column_name}${optional?'?':''}: ${mapping[c.udt_name]}${c.is_nullable==='YES'?' | null':''};\n`;
    }
    source+='};\n';
  }
  source+=`Relationships: ${JSON.stringify(t.relationships)};\n};\n`;
}
source+=`}; Views: { [_ in never]: never }; Functions: {
is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
admin_review_creature: { Args: { p_creature_id: number; p_status: string; p_verified_threat_level: string | null }; Returns: undefined };
mca_submit_creature: { Args: { p_request_id: string; p_draft: Json; p_image_path?: string | null }; Returns: Json };
mca_submit_creature_with_origin: { Args: { p_request_id: string; p_draft: Json; p_image_path?: string | null }; Returns: Json };
mca_add_origin: { Args: { p_kind: string; p_name: string; p_parent_id?: string | null }; Returns: Json };
mca_review_origin: { Args: { p_id: string; p_status: string; p_note?: string | null }; Returns: undefined };
mca_review_creature: { Args: { p_creature_id: string; p_status: string; p_verified_threat_level?: string | null }; Returns: undefined };
}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; } };
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];\n`;
await writeFile(new URL('../src/lib/supabase/database.types.ts',import.meta.url),source);
console.log('Generated audited MCA database types');
