"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: any;
  clinicName: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clinicName, setClinicName] = useState("LOGICLINIC+");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      setUser(supabaseUser);

      if (supabaseUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          
          if (profileData.clinic_id) {
            const { data: clinicData } = await supabase
              .from('clinics')
              .select('name')
              .eq('id', profileData.clinic_id)
              .single();
            if (clinicData) setClinicName(clinicData.name);
          } else if (profileData.role === "Super Admin") {
            setClinicName("Administration Globale");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching auth context:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Trigger re-fetch of profile if session changes
        fetchData();
      } else {
        setUser(null);
        setProfile(null);
        setClinicName("LOGICLINIC+");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, clinicName, loading, refresh: fetchData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
