// Prefixes
export const API_PREFIX = '/api';
export const ADMIN_PREFIX = '/admin';

// Base Paths
export const HOME_PATH = '/';
export const ADMIN_PATH = '/admin';
export const AUTH_BASE_PATH = '/auth';
export const USERS_BASE_PATH = '/users';
export const DOCUMENTS_BASE_PATH = '/documents';
export const CATEGORIES_BASE_PATH = '/categories';
export const SEARCH_BASE_PATH = '/search';

// === Client-side Pages ===
export const LOGIN_PAGE_PATH = `${AUTH_BASE_PATH}/login`; // /auth/login
export const REGISTER_PAGE_PATH = `${AUTH_BASE_PATH}/register`; // /auth/register
export const DOCUMENTS_PAGE_PATH = DOCUMENTS_BASE_PATH; // /documents
export const DOCUMENT_PAGE_PATH = (documentId: string) =>
    `${DOCUMENTS_BASE_PATH}/${documentId}`; // /documents/documentId
export const UPLOAD_PAGE_PATH = `${DOCUMENTS_BASE_PATH}/upload`; // /documents/upload
export const DOWNLOAD_PAGE_PATH = (documentId: string) =>
    `${DOCUMENTS_BASE_PATH}/${documentId}/download`; // /documents/download
export const DOCUMENT_EDIT_PAGE_PATH = (documentId: string) =>
    `${DOCUMENTS_BASE_PATH}/${documentId}/edit`; // /documents/edit
export const CATEGORY_PAGE_PATH = (categoryId: string) =>
    `${CATEGORIES_BASE_PATH}/${categoryId}`; // /categories/categoryId
export const CATEGORY_EDIT_PAGE_PATH = (categoryId: string) =>
    `${CATEGORIES_BASE_PATH}/${categoryId}/edit`; // /categories/categoryId/edit

// === API Routes ===

// Auth
export const API_AUTH_PATH = `${API_PREFIX}${AUTH_BASE_PATH}`; // /api/auth
export const API_LOGIN_PATH = `${API_AUTH_PATH}/login`; // /api/auth/login
export const API_LOGOUT_PATH = `${API_AUTH_PATH}/logout`; // /api/auth/logout
export const API_REGISTER_PATH = `${API_AUTH_PATH}/register`; // /api/auth/register
export const API_ME_PATH = `${API_AUTH_PATH}/me`; // /api/auth/me

// Users
export const API_USERS_PATH = `${API_PREFIX}${USERS_BASE_PATH}`; // /api/users
export const API_CREATE_USER_PATH = `${API_USERS_PATH}/create`;
export const API_UPDATE_USER_PATH = `${API_USERS_PATH}/edit`;
export const API_DELETE_USER_PATH = `${API_USERS_PATH}/delete`;

// Documents
export const API_DOCUMENTS_PATH = `${API_PREFIX}${DOCUMENTS_BASE_PATH}`; // /api/documents
export const API_DOCUMENT_UPLOAD_PATH = `${API_DOCUMENTS_PATH}/upload`;
export const API_DOCUMENT_DOWNLOAD_PATH = `${API_DOCUMENTS_PATH}/download/`;
export const API_DOCUMENT_DELETE_PATH = `${API_DOCUMENTS_PATH}/delete/`;
export const API_DOCUMENT_EDIT_PATH = (documentId: string) =>
    `${API_DOCUMENTS_PATH}/edit/${documentId}`;
export const API_DOCUMENT_DOWNLOAD_PATH_WITH_ID = (documentId: string) =>
    `${API_DOCUMENTS_PATH}/${documentId}/download`;
export const DOCUMENT_VIEWER_PATH = (documentId: string) =>
    `/api/documents/${documentId}/download?type=pdf&disposition=inline#toolbar=0&page=1&zoom=page-fit&view=FitH&scrollbar=0`;
export const API_DOCUMENTS_STAGE_PATH = `${API_DOCUMENTS_PATH}/attachments/stage`;
export const API_DOCUMENTS_COMPOSE_COMMIT_PATH = `${API_DOCUMENTS_PATH}/compose/commit`;

// Documents attachments
export const API_DOCUMENT_ATTACHMENTS_PATH = (documentId: string) =>
    `${API_DOCUMENTS_PATH}/${documentId}/attachments`;
export const API_DOCUMENT_ATTACHMENT_ITEM_PATH = (documentId: string, attachmentId: string) =>
    `${API_DOCUMENTS_PATH}/${documentId}/attachments/${attachmentId}`;
export const API_DOCUMENT_ATTACHMENTS_ARCHIVE_PATH = (documentId: string) =>
    `${API_DOCUMENTS_PATH}/${documentId}/attachments/archive`;

// Categories
export const API_CATEGORIES_PATH = `${API_PREFIX}${CATEGORIES_BASE_PATH}`; // /api/categories

// Search
export const API_SEARCH_PATH = `${API_PREFIX}${DOCUMENTS_BASE_PATH}${SEARCH_BASE_PATH}`; // /api/documents/search
