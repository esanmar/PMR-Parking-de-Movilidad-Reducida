
export interface GeoJsonProperties {
  NOMBRE?: string;
  Nombre?: string;
  DESC?: string;
  [key: string]: any;
}

export interface GeoJsonFeature {
  type: "Feature";
  properties: GeoJsonProperties;
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

export interface GeoJsonData {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface ParkingSpot {
  id: string;
  name: string;
  coordinates: [number, number]; // Lat, Lng
  properties: GeoJsonProperties;
  type: 'pmr' | 'moto';
}

export enum AppView {
  UPLOAD = 'UPLOAD',
  MAP = 'MAP'
}

export type DataSource = 'server' | 'local' | 'sample' | 'loading';
