# Phase 4: Production Database Migration Analysis

## 📊 **Production Database Overview**

**Database:** WordPress with prefix `xVhkH_`  
**Size:** 17MB SQL dump  
**Tables:** 55 total tables (8 core migration tables)  

## 🎯 **Core Migration Tables**

### **1. Users System**
- **`xVhkH_users`** - Core user accounts
  - Fields: ID, user_login, user_pass, user_email, user_registered, display_name
  - Maps to: `User` model in Prisma
  - Migration: WordPress roles → TALENT/EMPLOYER/ADMIN enum

- **`xVhkH_usermeta`** - User metadata and profiles
  - Fields: user_id, meta_key, meta_value
  - Contains: profile fields, capabilities, custom data
  - Maps to: User model fields + profile data

### **2. Jobs System**
- **`xVhkH_posts`** - Job postings (custom post types)
  - Fields: ID, post_author, post_title, post_content, post_status, post_date
  - Post types: likely 'job', 'role', etc.
  - Maps to: `Job` model in Prisma

- **`xVhkH_postmeta`** - Job metadata
  - Fields: post_id, meta_key, meta_value
  - Contains: payment info, location, requirements, applications
  - Maps to: Job model fields + related data

### **3. Skills System**
- **`xVhkH_terms`** - Skills and categories
  - Fields: term_id, name, slug, term_group
  - Maps to: `Skill` model in Prisma

- **`xVhkH_term_taxonomy`** - Skill hierarchy
  - Fields: term_taxonomy_id, term_id, taxonomy, parent, count
  - Defines parent/child relationships
  - Maps to: Skill.parentId relationships

- **`xVhkH_term_relationships`** - User-skill assignments
  - Fields: object_id, term_taxonomy_id, term_order
  - Links users to their skills
  - Maps to: `UserSkill` junction table

- **`xVhkH_termmeta`** - Additional skill metadata
  - Fields: term_id, meta_key, meta_value
  - Maps to: Skill model additional fields

## 🔄 **Migration Strategy**

### **Phase 4.1: Data Analysis & Mapping**
1. **Extract sample data** from each table
2. **Analyze WordPress meta fields** to understand custom data
3. **Map WordPress roles** to our role enum
4. **Identify skill taxonomy structure** (categories vs individual skills)
5. **Understand job posting workflow** and status mappings

### **Phase 4.2: Migration Scripts Development**
1. **User Migration Script**
   - Extract users with roles and metadata
   - Hash password compatibility (bcrypt vs WordPress)
   - Map profile fields to Prisma schema
   
2. **Skills Migration Script**
   - Extract skills hierarchy from terms/taxonomy
   - Preserve parent/child relationships
   - Migrate user-skill assignments
   
3. **Jobs Migration Script**
   - Extract job posts and metadata
   - Parse payment information
   - Map job statuses (draft/publish → OPEN/COMPLETED)
   - Link to employers (post_author)

4. **Applications Migration Script**
   - Extract from postmeta or comments
   - Link jobs to talent users
   - Preserve application status and dates

### **Phase 4.3: Data Validation & Testing**
1. **Relationship integrity** validation
2. **User authentication** testing
3. **API compatibility** verification
4. **Data count validation** (WordPress vs Prisma)

### **Phase 4.4: Production Migration Execution**
1. **Database backup** and safety measures
2. **Staged migration** with rollback capability
3. **API cutover** strategy
4. **User session handling** during transition

## 📋 **Migration Mapping**

### **WordPress → Prisma Schema Mapping**

```typescript
// Users
wp_users + wp_usermeta → User {
  id: wp_users.ID → cuid()
  email: wp_users.user_email
  name: wp_users.display_name
  role: wp_usermeta['wp_capabilities'] → TALENT/EMPLOYER/ADMIN
  password: wp_users.user_pass → bcrypt rehash
  createdAt: wp_users.user_registered
}

// Skills
wp_terms + wp_term_taxonomy → Skill {
  id: wp_terms.term_id → cuid()
  name: wp_terms.name
  category: wp_termmeta (if exists)
  parentId: wp_term_taxonomy.parent → cuid()
  isActive: true (default)
}

// User Skills
wp_term_relationships → UserSkill {
  userId: object_id → User.id
  skillId: term_taxonomy_id → Skill.id
}

// Jobs
wp_posts + wp_postmeta → Job {
  id: wp_posts.ID → cuid()
  title: wp_posts.post_title
  description: wp_posts.post_content
  status: wp_posts.post_status → OPEN/COMPLETED
  employerId: wp_posts.post_author → User.id
  createdAt: wp_posts.post_date
  payment: wp_postmeta['payment_amount']
  location: wp_postmeta['location']
}
```

## 🛠 **Next Steps**

1. **Analyze sample data** - Extract representative records from each table
2. **Build migration utilities** - Create parsing and transformation functions
3. **Develop migration scripts** - Automated WordPress → Prisma conversion
4. **Test with subset** - Validate migration with small data set
5. **Full migration execution** - Complete production data migration

## ⚠️ **Migration Considerations**

- **Password Hashing**: WordPress uses phpass, we use bcrypt
- **Role Mapping**: WordPress capabilities → our role enum
- **ID Strategy**: WordPress integer IDs → Prisma cuid()
- **Custom Fields**: WordPress meta_key/meta_value → structured fields
- **Relationships**: Preserve all user-skill and job-user relationships
- **Data Integrity**: Validate all relationships post-migration

## 📈 **Success Metrics**

- ✅ All users migrated with correct roles
- ✅ Skills hierarchy preserved exactly
- ✅ All job postings with complete metadata
- ✅ User-skill relationships intact
- ✅ API compatibility maintained
- ✅ Authentication working for all users 