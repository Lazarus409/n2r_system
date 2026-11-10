export interface RegistrationInput {
  name: string;
  gender: string;
  year: number;
  prog: string;
  phone: string;
  email: string;
  region: string;
  city: string;
  employer: string;
  title: string;
  industry: string;
  chapter: string;
  consent: boolean;
}

export type RegistrationField = keyof RegistrationInput;

export interface Alumnus extends Omit<RegistrationInput, "consent"> {
  id: string;
  verified: boolean;
  consent: true;
  submittedAt: string;
  verifiedAt?: string | null;
  updatedAt?: string | null;
  notes: string;
  sample?: boolean;
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string;
  action: string;
  recordId: string | null;
  summary: string;
}
