import AptitudeAceClient from '@/components/aptitude-ace-client';
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <AptitudeAceClient />
      <Toaster />
    </>
  );
}
