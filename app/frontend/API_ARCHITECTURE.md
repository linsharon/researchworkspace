# Frontend API Layer - Backend-First Design

## Overview

All frontend API calls follow a **backend-first** architecture:
- Primary data source is always the backend API
- localStorage is used **only as a non-authoritative fallback** for offline/network resilience
- User data persists is managed exclusively by the backend

## Architecture Principles

### 1. Backend-First Pattern
```typescript
// ✓ CORRECT: Try backend first, fallback to local if configured
const data = await withLocalFallback(
  async () => {
    // Primary: Backend API call
    const response = await axios.get('/api/v1/data');
    return response.data;
  },
  () => {
    // Fallback: Only in DEV with VITE_ENABLE_LOCAL_FALLBACK=true
    return loadCollection('storage-key');
  }
);

// ✗ WRONG: Using localStorage as primary source
const data = loadCollection('storage-key'); // DON'T DO THIS
```

### 2. Fallback Behavior
- **Production**: Backend API is mandatory, no fallback
- **Development**: If `VITE_ENABLE_LOCAL_FALLBACK=true`:
  - Network errors trigger fallback to localStorage
  - Timeout is reduced to 2.5s to enable faster fallback
- **Offline Mode**: Not intentionally supported; network failure is explicit

## API Modules

### Authentication API (`lib/auth.ts`)
**Backend-Authoritative**: YES
- `getCurrentUser()`: Fetch logged-in user from backend
- `login()`: Redirect to OIDC provider
- `logout()`: Logout and redirect

**localStorage Usage**:
- `rw-auth-token`: Stores JWT token for Authorization header
- `rw-auth-expires-at`: Stores token expiration time
- **Note**: These are read-only in the app; only modified by login/logout

### Manuscript API (`lib/manuscript-api.ts`)
**Backend-Authoritative**: YES (when backend is available)

**Modules**:
- **Projects**: create, list, get, update, delete
- **Papers**: create, list, listEntryPapers, get, update, delete
- **Notes**: create, list, get, update, delete
- **Highlights**: create, list, delete
- **Concepts**: create, list, update, delete
- **SearchRecords**: create, list, delete

**localStorage Fallback**:
```typescript
const STORAGE_KEYS = {
  papers: "rw-manuscript-papers",
  projects: "rw-manuscript-projects",
  notes: "rw-manuscript-notes",
  highlights: "rw-manuscript-highlights",
  concepts: "rw-manuscript-concepts",
};
```

**Backend Priority**:
1. Always try backend API first
2. On success: Update localStorage (optimization)
3. On network error: Use localStorage if available
4. On localStorage miss: Return empty or cached value

### Document API (`lib/document-api.ts`)
**Backend-Authoritative**: YES
- **No localStorage fallback**
- All operations are backed by the Document Management System
- Includes: create, update, list, search, delete, restore, upload, download

### Settings API (`api/settings.ts`)
**Backend-Authoritative**: YES
- Environment configuration management
- Admin-only access
- Read/update/delete backend environment variables

## Session Management

### Token Storage
```typescript
// Stored in localStorage for persistence across page reloads
setAuthSession(token, expiresAt) {
  localStorage.setItem("rw-auth-token", token);
  localStorage.setItem("rw-auth-expires-at", expiresAt);
}

// Used in every request via axios interceptor
Authorization: `Bearer ${token}`
```

### Session Validation
```typescript
// Check token expiration before each request
const token = getAuthToken();
if (isExpired(token)) {
  clearAuthSession();
  // User redirected to login by middleware
}
```

## Error Handling

### Network Errors
```typescript
function shouldFallbackToLocal(error) {
  if (!ENABLE_LOCAL_FALLBACK) return false;
  if (!isNetworkError(error)) return false;
  return true;
}
```

### HTTP Errors
- **401 Unauthorized**: Redirect to login
- **403 Forbidden**: Show permission error
- **404 Not Found**: Show not found error
- **5xx Server Error**: Show error message

## localStorage Usage Guidelines

### When to Use localStorage
✓ Authentication tokens (short-lived)
✓ User preferences (theme, language)
✓ Temporary UI state (form draft, scroll position)
✓ Recent searches/filters

### When NOT to Use localStorage
✗ Business data (papers, notes, projects, documents)
✗ Real-time collaboration state
✗ Sensitive information (passwords, API keys)
✗ Large data that changes frequently

### Cleanup Policy
```typescript
// Clear localStorage on logout
clearAuthSession() {
  localStorage.removeItem("rw-auth-token");
  localStorage.removeItem("rw-auth-expires-at");
  // Keep user preferences
}
```

## Testing Backend-First Behavior

### In Development
1. Disable fallback: `VITE_ENABLE_LOCAL_FALLBACK=false`
2. Run backend-only tests
3. Verify backend data consistency across page reloads

### In Production
1. Fallback is disabled by default
2. All data operations are backend-mandatory
3. Network errors are handled gracefully

## Migration Checklist

- [ ] Review all API calls for backend-first pattern
- [ ] Identify localStorage usage and categorize
- [ ] Remove mock data entry points from production code
- [ ] Update error handling for missing backend
- [ ] Add backend connectivity indicators
- [ ] Test page reload/device switch scenarios
- [ ] Verify all critical flows use backend data

## Common Patterns

### Reading Data
```typescript
// Pattern 1: Simple list
const items = await itemAPI.list();

// Pattern 2: With pagination
const { total, items } = await itemAPI.list({ limit: 20, offset: 0 });

// Pattern 3: With filters
const filtered = await itemAPI.list({ 
  status: 'active',
  sort: 'updated_at',
  limit: 20
});
```

### Writing Data
```typescript
// Create: Always backend
const newItem = await itemAPI.create(data);

// Update: Always backend
const updated = await itemAPI.update(id, data);

// Delete: Always backend
await itemAPI.delete(id);

// Soft Delete: Always backend
await itemAPI.softDelete(id);

// Restore: Always backend
await itemAPI.restore(id);
```

### Real-Time Synchronization
When user data is modified:
1. Send request to backend
2. Update local UI optimistically (if desired)
3. Wait for backend confirmation
4. Revert if backend returns error

## Environment Variables

| Variable | Dev Default | Prod Default | Purpose |
|----------|------------|-------------|---------|
| `VITE_ENABLE_LOCAL_FALLBACK` | false | false | Enable localStorage fallback for dev |
| `VITE_API_BASE_URL` | http://localhost:8000 | production URL | Backend API base URL |

## Next Steps

1. ✓ Backend-first architecture implemented
2. ✓ localStorage used only for auth tokens
3. ⏳ Remove mock data from production builds
4. ⏳ Add offline indicator when backend unavailable
5. ⏳ Implement automatic retry with exponential backoff
6. ⏳ Add request tracing and monitoring
