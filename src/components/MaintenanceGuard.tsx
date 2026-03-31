import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  'https://kcgszexuwgxqwwfnmyqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZ3N6ZXh1d2d4cXd3Zm5teXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Mzk1NjIsImV4cCI6MjA5MDUxNTU2Mn0.iCAE1riSUS6Rw3i8-tjVtUi3MCJSiz1nt_jLr3b-cvw'
);

// ⚠️ CHANGE THIS per project:
// E-Booking = 'ext-1'
// Tech Support = 'ext-2'
// EatsGo = 'ext-3'
// Educat = 'ext-4'
// Brgy 145 = 'ext-5'
const SYSTEM_ID = 'ext-2';

export default function MaintenanceGuard({ children }: { children: any }) {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current status
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('system_status')
        .select('is_locked')
        .eq('id', SYSTEM_ID)
        .single();
      if (data) setIsLocked(data.is_locked);
      setLoading(false);
    };

    fetchStatus();

    // Listen for REAL-TIME changes from Devspace
    const channel = supabase
      .channel('maintenance')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'system_status',
        filter: `id=eq.${SYSTEM_ID}`
      }, (payload: any) => {
        setIsLocked(payload.new.is_locked);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;

  if (isLocked) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0B1110', color: '#E5E9E8',
        fontFamily: 'system-ui, sans-serif', zIndex: 99999
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
          System Under Maintenance
        </h1>
        <p style={{ opacity: 0.5, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          This system is currently being optimized by the administrators. Please check back shortly.
        </p>
      </div>
    );
  }

  return children;
}
