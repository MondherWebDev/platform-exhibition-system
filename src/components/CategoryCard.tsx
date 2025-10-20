import React from "react";
import { DataItem, ExhibitorData, SponsorData, HostedBuyerData, SpeakerData } from "../utils/dataUploadService";

interface BaseCardProps {
  item: DataItem;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ExhibitorCard({ item, onEdit, onDelete }: BaseCardProps) {
  const exhibitor = item as ExhibitorData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {exhibitor.logo_url && (
            <img
              src={exhibitor.logo_url}
              alt={`${exhibitor.company_name} logo`}
              className="w-12 h-12 object-contain rounded"
            />
          )}
          <div>
            <h3 className="font-bold text-lg text-gray-800">{exhibitor.company_name}</h3>
            <p className="text-sm text-gray-600">Booth #{exhibitor.booth_number}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(exhibitor.id)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(exhibitor.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Contact:</span>
          <span className="ml-2 text-gray-600">{exhibitor.contact_person}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Email:</span>
          <span className="ml-2 text-gray-600">{exhibitor.email}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Phone:</span>
          <span className="ml-2 text-gray-600">{exhibitor.phone}</span>
        </div>
        {exhibitor.website && (
          <div className="flex items-center text-sm">
            <span className="font-medium text-gray-700">Website:</span>
            <a
              href={exhibitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}
        <div className="mt-3">
          <p className="text-sm text-gray-700">{exhibitor.company_description}</p>
        </div>
      </div>
    </div>
  );
}

export function SponsorCard({ item, onEdit, onDelete }: BaseCardProps) {
  const sponsor = item as SponsorData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-yellow-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {sponsor.logo_url && (
            <img
              src={sponsor.logo_url}
              alt={`${sponsor.company_name} logo`}
              className="w-12 h-12 object-contain rounded"
            />
          )}
          <div>
            <h3 className="font-bold text-lg text-gray-800">{sponsor.company_name}</h3>
            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
              {sponsor.sponsorship_level} Sponsor
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(sponsor.id)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(sponsor.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Contact:</span>
          <span className="ml-2 text-gray-600">{sponsor.contact_person}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Email:</span>
          <span className="ml-2 text-gray-600">{sponsor.email}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Phone:</span>
          <span className="ml-2 text-gray-600">{sponsor.phone}</span>
        </div>
        {sponsor.website && (
          <div className="flex items-center text-sm">
            <span className="font-medium text-gray-700">Website:</span>
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}
        <div className="mt-3">
          <p className="text-sm text-gray-700">{sponsor.company_description}</p>
        </div>
      </div>
    </div>
  );
}

export function HostedBuyerCard({ item, onEdit, onDelete }: BaseCardProps) {
  const buyer = item as HostedBuyerData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {buyer.profile_image && (
            <img
              src={buyer.profile_image}
              alt={buyer.full_name}
              className="w-12 h-12 object-cover rounded-full"
            />
          )}
          <div>
            <h3 className="font-bold text-lg text-gray-800">{buyer.full_name}</h3>
            <p className="text-sm text-gray-600">{buyer.job_title}</p>
            <p className="text-sm text-gray-600">{buyer.company}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(buyer.id)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(buyer.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Email:</span>
          <span className="ml-2 text-gray-600">{buyer.email}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Phone:</span>
          <span className="ml-2 text-gray-600">{buyer.phone}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Country:</span>
          <span className="ml-2 text-gray-600">{buyer.country}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Industry:</span>
          <span className="ml-2 text-gray-600">{buyer.industry}</span>
        </div>
        <div className="mt-3">
          <p className="text-sm text-gray-700">{buyer.bio}</p>
        </div>
      </div>
    </div>
  );
}

export function SpeakerCard({ item, onEdit, onDelete }: BaseCardProps) {
  const speaker = item as SpeakerData;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {speaker.profile_image && (
            <img
              src={speaker.profile_image}
              alt={speaker.full_name}
              className="w-12 h-12 object-cover rounded-full"
            />
          )}
          <div>
            <h3 className="font-bold text-lg text-gray-800">{speaker.full_name}</h3>
            <p className="text-sm text-gray-600">{speaker.job_title}</p>
            <p className="text-sm text-gray-600">{speaker.company}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(speaker.id)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(speaker.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Email:</span>
          <span className="ml-2 text-gray-600">{speaker.email}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Phone:</span>
          <span className="ml-2 text-gray-600">{speaker.phone}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Session:</span>
          <span className="ml-2 text-gray-600">{speaker.session_topic}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-700">Time:</span>
          <span className="ml-2 text-gray-600">{speaker.session_time}</span>
        </div>
        <div className="mt-3">
          <p className="text-sm text-gray-700">{speaker.bio}</p>
        </div>
      </div>
    </div>
  );
}

// Generic card renderer
export function CategoryCard({ item, onEdit, onDelete }: BaseCardProps) {
  switch (item.category) {
    case "exhibitors":
      return <ExhibitorCard item={item} onEdit={onEdit} onDelete={onDelete} />;
    case "sponsors":
      return <SponsorCard item={item} onEdit={onEdit} onDelete={onDelete} />;
    case "hosted-buyers":
      return <HostedBuyerCard item={item} onEdit={onEdit} onDelete={onDelete} />;
    case "speakers":
      return <SpeakerCard item={item} onEdit={onEdit} onDelete={onDelete} />;
    default:
      return null;
  }
}
