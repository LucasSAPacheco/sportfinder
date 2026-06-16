import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from 'react-router-dom'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const institutionIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;
    background:#1B4D3B;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
})

const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="
        width:20px;height:20px;
        background:#3B82F6;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 2px 8px rgba(59,130,246,0.5);
        position:absolute;top:0;left:0;
      "></div>
      <div style="
        width:44px;height:44px;
        background:rgba(59,130,246,0.15);
        border-radius:50%;
        position:absolute;
        top:50%;left:50%;
        transform:translate(-50%,-50%);
        animation:ping 1.5s ease-in-out infinite;
      "></div>
    </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function RecenterMap({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom(), { animate: true })
  }, [center, zoom, map])
  return null
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

const BRASIL_CENTER = [-15.77972, -47.92972]

export default function MapaInstituicoes({ posicao, centroMapa, raioKm, instituicoes, onMapClick }) {
  const navigate = useNavigate()
  const center = posicao
    ? [posicao.lat, posicao.lon]
    : centroMapa
    ? [centroMapa.lat, centroMapa.lon]
    : BRASIL_CENTER
  const zoom = posicao ? 13 : centroMapa ? 12 : 5

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap center={center} zoom={posicao ? 13 : undefined} />
      <MapClickHandler onClick={onMapClick} />

      {posicao && (
        <>
          <Marker position={[posicao.lat, posicao.lon]} icon={userIcon}>
            <Popup>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Você está aqui</span>
            </Popup>
          </Marker>
          <Circle
            center={[posicao.lat, posicao.lon]}
            radius={raioKm * 1000}
            pathOptions={{
              color: '#1B4D3B',
              fillColor: '#1B4D3B',
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: '5 5',
            }}
          />
        </>
      )}

      {instituicoes.map((inst) =>
        inst.latitude && inst.longitude ? (
          <Marker
            key={inst.id}
            position={[inst.latitude, inst.longitude]}
            icon={institutionIcon}
          >
            <Popup maxWidth={200}>
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <p style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a1a', margin: '0 0 2px' }}>
                  {inst.nome_fantasia}
                </p>
                {inst.distancia_km != null && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>
                    {inst.distancia_km} km de você
                  </p>
                )}
                {inst.endereco && (
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px' }}>
                    {inst.endereco}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/instituicao/${inst.id}`)}
                  style={{
                    background: '#1B4D3B',
                    color: 'white',
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: '600',
                  }}
                >
                  Ver detalhes
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  )
}
