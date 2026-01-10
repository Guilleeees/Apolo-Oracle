
export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
}

class ClassroomService {
  private accessToken: string | null = null;
  private client: any = null;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me',
    'https://www.googleapis.com/auth/classroom.rosters.readonly'
  ].join(' ');

  initAuth(clientId: string, onTokenReceived: (token: string) => void) {
    if (!(window as any).google || !clientId || clientId.trim() === '' || clientId.includes('TU_CLIENT_ID')) {
      return;
    }

    try {
      this.client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: this.SCOPES,
        callback: (response: any) => {
          if (response.error) {
            console.error("Auth Error:", response.error);
            return;
          }
          if (response.access_token) {
            this.accessToken = response.access_token;
            onTokenReceived(response.access_token);
          }
        },
      });
    } catch (e) {
      console.error("GIS Init Failed", e);
    }
  }

  signIn() {
    if (this.client) {
      this.client.requestAccessToken({ prompt: 'consent' });
    } else {
      alert("Configura un Client ID válido en Ajustes.");
    }
  }

  async fetchCourses(): Promise<ClassroomCourse[]> {
    if (!this.accessToken) throw new Error("No Token");
    
    const response = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { 
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    return data.courses || [];
  }

  async fetchCourseWork(courseId: string) {
    if (!this.accessToken || !courseId) return [];
    const cleanId = encodeURIComponent(courseId.trim());
    const response = await fetch(`https://classroom.googleapis.com/v1/courses/${cleanId}/courseWork`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.courseWork || [];
  }
}

export const classroomService = new ClassroomService();
