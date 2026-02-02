import { FormData } from '../../types';

export interface FormStepProps {
  data: FormData;
  // Cambiamos 'string | number | symbol' por 'keyof FormData'
  updateData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}