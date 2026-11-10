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

export interface Alumnus extends Omit<RegistrationInput, "consent"> {
  id: string;
  verified: boolean;
  consent: true;
  submittedAt: string;
  verifiedAt?: string;
  sample?: boolean;
}
