import { Dispatch, SetStateAction } from "react";
import { FormData } from "../../types";

export interface FormStepProps {
  data: FormData;
  // ✅ FIX: value tipado como FormData[keyof FormData] en vez de any
  updateData: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: Record<string, string>;
  setErrors?: Dispatch<SetStateAction<Record<string, string>>>;
  // Opcionales para la edición de perfil
  hidePasswordFields?: boolean;
  disableEmail?: boolean;
}