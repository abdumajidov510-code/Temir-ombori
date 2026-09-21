import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/tovarlar';

export default function Tovarlar() {
  const [tovarlar, setTovarlar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qidiruv, setQidiruv] = useState('');
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirlashId, setTahrirlashId] = useState(null);

  // Database ustunlariga mos holatlar
  const [formData, setFormData] = useState({
    nom: '',
    kategoriya: 'Asboblar',
    narx: '',
    miqdor: '',
    min_zaxira: '',
    birlik: 'dona'
  });

  // Tovarlarni backend'dan yuklash
  const fetchTovarlar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setTovarlar(res.data);
    } catch (err) {
      console.error("Tovarlarni yuklashda xatolik:", err);
      alert("Serverdan ma'lumot olishda xatolik yuz berdi!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTovarlar();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Modalni ochish
  const openModal = (tovar = null) => {
    if (tovar) {
      setTahrirlashId(tovar.id);
      setFormData({
        nom: tovar.nom,
        kategoriya: tovar.kategoriya || 'Asboblar',
        narx: tovar.narx,
        miqdor: tovar.miqdor,
        min_zaxira: tovar.min_zaxira,
        birlik: tovar.birlik
      });
    } else {
      setTahrirlashId(null);
      setFormData({ nom: '', kategoriya: 'Asboblar', narx: '', miqdor: '', min_zaxira: '', birlik: 'dona' });
    }
    setModalOchiq(true);
  };

  // Tovar saqlash (POST / PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (tahrirlashId) {
        await axios.put(`${API_URL}/${tahrirlashId}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      setModalOchiq(false);
      fetchTovarlar();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
      alert("Ma'lumotni saqlashda xatolik yuz berdi!");
    }
  };

  // Tovarni o'chirish (DELETE)
  const handleDelete = async (id) => {
    if (window.confirm("Haqiqatan ham ushbu tovarni o'chirmoqchimisiz?")) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        fetchTovarlar();
      } catch (err) {
        console.error("O'chirishda xatolik:", err);
        alert("Tovarni o'chirishda xatolik yuz berdi!");
      }
    }
  };

  // Qidiruv
  const saralanganTovarlar = tovarlar.filter(item =>
    item.nom?.toLowerCase().includes(qidiruv.toLowerCase()) ||
    item.kategoriya?.toLowerCase().includes(qidiruv.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Sarlavha va Tugma */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 Mahsulotlar Ombori</h1>
          <p className="text-sm text-slate-500">Ombordagi barcha tovarlarni boshqarish</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
        >
          <Plus size={18} /> Yangi Tovar Qo'shish
        </button>
      </div>

      {/* Qidiruv va Yangilash */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center justify-between gap-4 border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tovar nomini yoki kategoriyani qidirish..."
            value={qidiruv}
            onChange={(e) => setQidiruv(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
        </div>
        <button
          onClick={fetchTovarlar}
          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          title="Yangilash"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tovarlar Jadvali */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">ID</th>
                <th className="p-4">Tovar Nomi</th>
                <th className="p-4">Kategoriya</th>
                <th className="p-4">Birligi</th>
                <th className="p-4">Narxi (So'm)</th>
                <th className="p-4">Ombordagi Miqdor</th>
                <th className="p-4">Holati</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : saralanganTovarlar.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    Hech qanday tovar topilmadi.
                  </td>
                </tr>
              ) : (
                saralanganTovarlar.map((tovar) => {
                  const kamQolgan = Number(tovar.miqdor) <= Number(tovar.min_zaxira);
                  return (
                    <tr key={tovar.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-mono text-slate-500">#{tovar.id}</td>
                      <td className="p-4 font-semibold text-slate-800">{tovar.nom}</td>
                      <td className="p-4 text-slate-600">{tovar.kategoriya || '-'}</td>
                      <td className="p-4 text-slate-600">{tovar.birlik}</td>
                      <td className="p-4 font-mono font-medium text-slate-700">
                        {Number(tovar.narx).toLocaleString('uz-UZ')}
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-800">
                        {tovar.miqdor} {tovar.birlik}
                      </td>
                      <td className="p-4">
                        {kamQolgan ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            <AlertTriangle size={12} /> Kam qolgan
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">
                            Yetarli
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openModal(tovar)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(tovar.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tovar Qo'shish / Tahrirlash */}
      {modalOchiq && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {tahrirlashId ? "Tovarni Tahrirlash" : "Yangi Tovar Qo'shish"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tovar Nomi</label>
                <input
                  type="text"
                  name="nom"
                  required
                  value={formData.nom}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Masalan: Otvyortka"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kategoriya</label>
                  <input
                    type="text"
                    name="kategoriya"
                    value={formData.kategoriya}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Asboblar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Birligi</label>
                  <select
                    name="birlik"
                    value={formData.birlik}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="dona">Dona</option>
                    <option value="metr">Metr</option>
                    <option value="kg">Kg</option>
                    <option value="quti">Quti</option>
                    <option value="tonna">Tonna</option>
                    <option value="m2">m²</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Narxi (So'm)</label>
                <input
                  type="number"
                  name="narx"
                  required
                  value={formData.narx}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="40000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Miqdori</label>
                  <input
                    type="number"
                    step="0.01"
                    name="miqdor"
                    required
                    value={formData.miqdor}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Min Zaxira</label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_zaxira"
                    required
                    value={formData.min_zaxira}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOchiq(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
