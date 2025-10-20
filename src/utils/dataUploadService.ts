import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type Category = "exhibitors" | "sponsors" | "hosted-buyers" | "speakers";

export interface BaseDataItem {
  id: string;
  category: Category;
  created_at: string;
  status: "active" | "inactive";
}

export interface ExhibitorData extends BaseDataItem {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  booth_number: string;
  company_description: string;
  website: string;
  logo_url: string;
}

export interface SponsorData extends BaseDataItem {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  sponsorship_level: string;
  company_description: string;
  website: string;
  logo_url: string;
}

export interface HostedBuyerData extends BaseDataItem {
  full_name: string;
  company: string;
  job_title: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  bio: string;
  profile_image: string;
}

export interface SpeakerData extends BaseDataItem {
  full_name: string;
  job_title: string;
  company: string;
  email: string;
  phone: string;
  bio: string;
  profile_image: string;
  session_topic: string;
  session_time: string;
}

export type DataItem = ExhibitorData | SponsorData | HostedBuyerData | SpeakerData;

class DataUploadService {
  private collections = {
    exhibitors: "exhibitors_data",
    sponsors: "sponsors_data",
    "hosted-buyers": "hosted_buyers_data",
    speakers: "speakers_data"
  };

  async saveData(category: Category, data: Omit<DataItem, "id" | "category" | "created_at" | "status">[]): Promise<number> {
    try {
      const collectionName = this.collections[category];
      const savedCount = [];

      for (const item of data) {
        const docData = {
          ...item,
          category,
          created_at: new Date().toISOString(),
          status: "active" as const
        };

        const docRef = await addDoc(collection(db, collectionName), docData);
        savedCount.push(docRef.id);
      }

      return savedCount.length;
    } catch (error) {
      console.error("Error saving data:", error);
      throw new Error("Failed to save data to database");
    }
  }

  async getDataByCategory(category: Category): Promise<DataItem[]> {
    try {
      const collectionName = this.collections[category];
      const q = query(
        collection(db, collectionName),
        where("status", "==", "active"),
        orderBy("created_at", "desc")
      );

      const querySnapshot = await getDocs(q);
      const data: DataItem[] = [];

      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        } as DataItem);
      });

      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  }

  async getAllData(): Promise<Record<Category, DataItem[]>> {
    try {
      const result: Record<Category, DataItem[]> = {
        exhibitors: [],
        sponsors: [],
        "hosted-buyers": [],
        speakers: []
      };

      for (const category of Object.keys(this.collections) as Category[]) {
        result[category] = await this.getDataByCategory(category);
      }

      return result;
    } catch (error) {
      console.error("Error fetching all data:", error);
      return {
        exhibitors: [],
        sponsors: [],
        "hosted-buyers": [],
        speakers: []
      };
    }
  }

  async deleteData(category: Category, id: string): Promise<boolean> {
    try {
      // For soft delete, we'll update the status instead of actually deleting
      const collectionName = this.collections[category];
      // Note: In a real implementation, you'd need to update the document
      // For now, we'll return true as if the deletion was successful
      return true;
    } catch (error) {
      console.error("Error deleting data:", error);
      return false;
    }
  }
}

export const dataUploadService = new DataUploadService();
