export interface IIdentity
{
    id: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    email?: string;
    roles: Array<string>;
}

export enum UserRole
{
    SystemAdmin = 'system_admin',
    UserAdmin = 'user_admin',
    WorkspaceAdmin = 'workspace_admin'
}
