
import { apiService } from "./api.service";
import { LoginRequest, ResetPasswordRequest, LoginResponse } from "@/models/models";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

class AuthService {
  // Generate a random 10-digit ID
  generateUserId(): string {
    // Generate a number between 1000000000 and 9999999999 (10 digits)
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  // Get current user type
  getUserType(): 'admin' | 'doctor' | 'hospital' | 'user' | null {
    return localStorage.getItem('userType') as 'admin' | 'doctor' | 'hospital' | 'user' | null;
  }

  // Get current user ID
  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  // Get user name
  getUserName(): string | null {
    return localStorage.getItem('userName');
  }

  // Login
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Different login logic for each user type
      if (request.userType === 'admin') {
        // For admin, use a special table or check
        if (request.userId === 'admin' && request.password === 'admin') {
          // Mock admin login for testing
          const token = 'admin-token-' + Date.now();
          localStorage.setItem('token', token);
          localStorage.setItem('userId', request.userId);
          localStorage.setItem('userType', request.userType);
          localStorage.setItem('userName', 'Administrator');
          
          return {
            success: true,
            token,
            userId: request.userId,
            name: 'Administrator'
          };
        } else {
          return { success: false, error: 'Invalid admin credentials' };
        }
      } else {
        // For other user types, query the appropriate table
        let tableName;
        switch (request.userType) {
          case 'doctor': tableName = 'doctors'; break;
          case 'hospital': tableName = 'hospitals'; break;
          case 'user': tableName = 'patients'; break;
          default: return { success: false, error: 'Invalid user type' };
        }
        
        // For testing purposes only - remove in production
        if (request.userId === request.userType && request.password === request.userType) {
          const token = `${request.userType}-token-${Date.now()}`;
          localStorage.setItem('token', token);
          localStorage.setItem('userId', request.userId);
          localStorage.setItem('userType', request.userType);
          localStorage.setItem('userName', request.userType.charAt(0).toUpperCase() + request.userType.slice(1));
          
          return {
            success: true,
            token,
            userId: request.userId,
            name: request.userType.charAt(0).toUpperCase() + request.userType.slice(1)
          };
        }
        
        // In a real implementation, check the password against a hashed version in the database
        try {
          // Using maybeSingle() instead of single() to avoid errors with missing data
          const { data, error } = await supabase
            .from(tableName)
            .select('id, name, email, mobile_number')
            .eq('id', request.userId)
            .maybeSingle();
            
          if (error) {
            console.error("Supabase error:", error);
            return { success: false, error: 'User not found' };
          }
          
          if (!data) {
            return { success: false, error: 'User not found' };
          }
          
          // In a real application, you would verify the password here
          // For now, we're allowing any password for demonstration
          const token = `${request.userType}-token-${Date.now()}`;
          
          // Correctly extract values from the data object with proper type checking
          let userId = '';
          let userName = '';
          let userEmail = '';
          let userMobile = '';
          
          // Ensuring data is not null before accessing its properties
          if (data) {
            // Check if id exists and is of the right type
            if ('id' in data && data.id !== null && (typeof data.id === 'string' || typeof data.id === 'number')) {
              userId = String(data.id);
            }
            
            // Check if name exists and is of the right type
            if ('name' in data && data.name !== null && typeof data.name === 'string') {
              userName = data.name;
            }
            
            // Check if email exists
            if ('email' in data && data.email !== null && typeof data.email === 'string') {
              userEmail = data.email;
            }
            
            // Check if mobile_number exists
            if ('mobile_number' in data && data.mobile_number !== null && typeof data.mobile_number === 'string') {
              userMobile = data.mobile_number;
            }
          }
          
          localStorage.setItem('token', token);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userType', request.userType);
          localStorage.setItem('userName', userName);
          localStorage.setItem('userEmail', userEmail || '');
          localStorage.setItem('userMobile', userMobile || '');
          
          return {
            success: true,
            token,
            userId,
            name: userName
          };
        } catch (error) {
          console.error("Database query error:", error);
          return { success: false, error: 'User not found or database error' };
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  // Logout
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userMobile');
    
    // Redirect to home page
    window.location.href = '/';
  }

  // Send OTP for password reset
  async sendOTP(userId: string, userType: 'doctor' | 'hospital' | 'user'): Promise<boolean> {
    try {
      // Get the user's email based on userType
      let tableName;
      
      switch (userType) {
        case 'doctor': tableName = 'doctors'; break;
        case 'hospital': tableName = 'hospitals'; break;
        case 'user': tableName = 'patients'; break;
        default: return false;
      }
      
      // Get user email from the appropriate table
      const { data: userData, error: userError } = await supabase
        .from(tableName)
        .select('email')
        .eq('id', userId)
        .maybeSingle();
        
      if (userError) {
        console.error("Error fetching user email:", userError);
        toast({
          title: "Error",
          description: "User not found or email not available.",
          variant: "destructive",
        });
        return false;
      }

      // Ensure userData and email exist before proceeding
      if (!userData) {
        console.error("User email not found");
        toast({
          title: "Error",
          description: "User not found or email not available.",
          variant: "destructive",
        });
        return false;
      }
      
      // Safely type check and extract email
      if (!('email' in userData) || typeof userData.email !== 'string') {
        console.error("Email field missing or invalid in user data");
        toast({
          title: "Error",
          description: "Email not available for this user.",
          variant: "destructive",
        });
        return false;
      }
      
      const email = userData.email;
      
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in Supabase with expiration time (10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now
      
      // Check if an OTP entry already exists
      const { data: existingOtp, error: selectError } = await supabase
        .from('otps')
        .select()
        .eq('id', userId) // Using id directly since we don't have user_id field
        .maybeSingle();
      
      if (selectError) {
        console.error("Error checking existing OTP:", selectError);
        return false;
      }
      
      if (existingOtp) {
        // Update existing OTP
        const { error: updateError } = await supabase
          .from('otps')
          .update({
            otp_value: otp,
            validity: expiresAt.toISOString()
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating OTP:", updateError);
          return false;
        }
      } else {
        // Create new OTP entry
        const { error: insertError } = await supabase
          .from('otps')
          .insert({
            id: userId, // Use the userId as the id
            otp_value: otp,
            validity: expiresAt.toISOString(),
            expired: false
          });
          
        if (insertError) {
          console.error("Error creating OTP:", insertError);
          return false;
        }
      }
      
      // In a real application, send email with OTP
      console.log(`OTP for ${userType} with ID ${userId}: ${otp} (would be sent to ${email})`);
      
      toast({
        title: "OTP Sent",
        description: `An OTP has been sent to ${email}.`,
      });
      
      return true;
    } catch (error) {
      console.error("Send OTP error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(userId: string, otp: string, userType: 'doctor' | 'hospital' | 'user'): Promise<boolean> {
    try {
      // Get the stored OTP for this user
      const { data, error } = await supabase
        .from('otps')
        .select('otp_value, validity')
        .eq('id', userId)
        .maybeSingle();
      
      if (error || !data) {
        console.error("Error fetching OTP:", error);
        toast({
          title: "Error",
          description: "Invalid or expired OTP. Please request a new one.",
          variant: "destructive",
        });
        return false;
      }
      
      // Check if OTP is expired
      const now = new Date();
      const expiresAt = new Date(data.validity);
      
      if (now > expiresAt) {
        toast({
          title: "Error",
          description: "OTP has expired. Please request a new one.",
          variant: "destructive",
        });
        return false;
      }
      
      // Check if OTP matches
      if (data.otp_value === otp) {
        toast({
          title: "OTP Verified",
          description: "OTP verification successful.",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }

  // Reset password
  async resetPassword(request: ResetPasswordRequest): Promise<boolean> {
    try {
      // Update password in the appropriate table
      let tableName;
      
      switch (request.userType) {
        case 'doctor': tableName = 'doctors'; break;
        case 'hospital': tableName = 'hospitals'; break;
        case 'user': tableName = 'patients'; break;
        default: return false;
      }
      
      // In a real application, you would hash the password before storing it
      const { error } = await supabase
        .from(tableName)
        .update({ password: request.newPassword }) // In production, this should be a hashed password
        .eq('id', request.userId);
        
      if (error) {
        console.error("Error resetting password:", error);
        toast({
          title: "Error",
          description: "Failed to reset password. Please try again.",
          variant: "destructive",
        });
        return false;
      }
      
      // Delete the OTP entry after successful password reset
      await supabase
        .from('otps')
        .delete()
        .eq('id', request.userId);
      
      toast({
        title: "Password Reset",
        description: "Your password has been successfully reset.",
      });
      return true;
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }

  // Change password for logged in user
  async changePassword(newPassword: string, confirmPassword: string): Promise<boolean> {
    const userId = this.getUserId();
    const userType = this.getUserType();
    
    if (!userId || !userType || !['doctor', 'hospital', 'user'].includes(userType)) {
      toast({
        title: "Error",
        description: "Session expired. Please login again.",
        variant: "destructive",
      });
      return false;
    }
    
    return await this.resetPassword({
      userId,
      newPassword,
      confirmPassword,
      userType: userType as 'doctor' | 'hospital' | 'user'
    });
  }

  // Get current user details
  async getCurrentUserDetails(): Promise<any> {
    const userId = this.getUserId();
    const userType = this.getUserType();
    
    if (!userId || !userType) {
      return null;
    }
    
    let tableName;
    switch (userType) {
      case 'doctor': tableName = 'doctors'; break;
      case 'hospital': tableName = 'hospitals'; break;
      case 'user': tableName = 'patients'; break;
      default: return null;
    }
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error(`Error fetching ${userType} details:`, error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${userType} details:`, error);
      return null;
    }
  }

  // Register a new doctor
  async registerDoctor(doctorData: Omit<any, 'id'>): Promise<string | null> {
    try {
      // Generate a 10-digit ID for the doctor
      const newDoctorId = this.generateUserId();
      
      const { error } = await supabase
        .from('doctors')
        .insert({
          ...doctorData,
          id: newDoctorId
        });
        
      if (error) {
        console.error("Error registering doctor:", error);
        return null;
      }
      
      return newDoctorId;
    } catch (error) {
      console.error("Doctor registration error:", error);
      return null;
    }
  }

  // Register a new hospital
  async registerHospital(hospitalData: Omit<any, 'id'>): Promise<string | null> {
    try {
      // Generate a 10-digit ID for the hospital
      const newHospitalId = this.generateUserId();
      
      const { error } = await supabase
        .from('hospitals')
        .insert({
          ...hospitalData,
          id: newHospitalId
        });
        
      if (error) {
        console.error("Error registering hospital:", error);
        return null;
      }
      
      return newHospitalId;
    } catch (error) {
      console.error("Hospital registration error:", error);
      return null;
    }
  }

  // Register a new user/patient
  async registerUser(userData: Omit<any, 'id'>): Promise<string | null> {
    try {
      // Generate a 10-digit ID for the user
      const newUserId = this.generateUserId();
      
      const { error } = await supabase
        .from('patients')
        .insert({
          ...userData,
          id: newUserId
        });
        
      if (error) {
        console.error("Error registering user:", error);
        return null;
      }
      
      return newUserId;
    } catch (error) {
      console.error("User registration error:", error);
      return null;
    }
  }
}

export const authService = new AuthService();
