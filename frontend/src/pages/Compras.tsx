import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  TablePagination,
  Card,
  TableContainer,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import {
  LocalShipping,
  Check,
  AddShoppingCart,
  FactCheck,
  Edit,
  Delete,
  Visibility,
  Print,
  Email,
  Close,
} from '@mui/icons-material';
import { apiFetch, useAuthStore } from '../store/useAuthStore';

export default function Compras() {
  const usuario = useAuthStore((state) => state.usuario);

  // Datos
  const [compras, setCompras] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  // Modales
  const [openOC, setOpenOC] = useState(false);
  const [ocForm, setOcForm] = useState<any>({
    proveedorId: '',
    sucursalId: '',
    fechaEntrega: '',
    productos: [],
  });
  const [nuevoItem, setNuevoItem] = useState({
    productoId: '',
    cantidad: '',
    costoUnitario: '',
    notas: '',
  });

  const [openRecepcion, setOpenRecepcion] = useState(false);
  const [selectedOC, setSelectedOC] = useState<any>(null);
  const [recepcionLotes, setRecepcionLotes] = useState<any[]>([]); // Array de datos de lote por cada detalle de OC

  const [openEditarOC, setOpenEditarOC] = useState(false);
  const [editarOcForm, setEditarOcForm] = useState<any>({
    proveedorId: '',
    sucursalId: '',
    fechaEntrega: '',
    productos: [],
    estado: '',
  });
  const [nuevoItemEdit, setNuevoItemEdit] = useState({
    productoId: '',
    cantidad: '',
    costoUnitario: '',
    notas: '',
  });
  const [openEliminarOC, setOpenEliminarOC] = useState(false);

  // Notificaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Buscador de órdenes de compra
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);

  const [openPreviewOC, setOpenPreviewOC] = useState(false);
  const [selectedPreviewOC, setSelectedPreviewOC] = useState<any>(null);

  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    para: '',
    asunto: '',
    mensajeAdicional: '',
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setSelectedRowId(null);
    setPage(0);
    try {
      const data = await apiFetch('/compras');
      setCompras(data);

      const prov = await apiFetch('/proveedores');
      setProveedores(prov.filter((p: any) => p.estado === 'ACTIVO'));

      const suc = await apiFetch('/sucursales');
      setSucursales(suc);

      const prod = await apiFetch('/productos');
      setProductos(prod.filter((p: any) => p.estado === 'ACTIVO'));
    } catch (e) {
      console.error(e);
    }
  };

  const calcularFechaEntregaSugerida = (items: any[]) => {
    if (!items || items.length === 0) {
      return '';
    }
    let maxDate = items[0].fechaEntrega || '';
    for (const item of items) {
      if (item.fechaEntrega && (!maxDate || item.fechaEntrega > maxDate)) {
        maxDate = item.fechaEntrega;
      }
    }
    return maxDate;
  };

  const handleAgregarItem = () => {
    if (!nuevoItem.productoId || !nuevoItem.cantidad || !nuevoItem.costoUnitario) {
      setErrorMsg('Seleccione un producto, cantidad y costo.');
      return;
    }
    setErrorMsg(null);
    const prod = productos.find((p) => p.id === nuevoItem.productoId);
    // Verificar si el producto ya existe en la lista para evitar duplicados
    if (ocForm.productos.some((p: any) => p.productoId === nuevoItem.productoId)) {
      setErrorMsg('Este producto ya ha sido agregado. Edite la línea correspondiente o elimínela para volver a agregarla.');
      return;
    }
    if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
      if (parseFloat(nuevoItem.cantidad) % 1 !== 0) {
        setErrorMsg(`Para productos en Unidades (${prod.descripcion}), la cantidad debe ser un número entero.`);
        return;
      }
    }
    const updatedProductos = [
      ...ocForm.productos,
      {
        lineaNum: ocForm.productos.length + 1,
        productoId: nuevoItem.productoId,
        productoNombre: prod ? prod.descripcion : '',
        productoSku: prod ? prod.sku : '',
        cantidad: parseFloat(nuevoItem.cantidad),
        costoUnitario: parseFloat(nuevoItem.costoUnitario),
        fechaEntrega: dayjs().add(prod?.leadTime || 0, 'day').format('YYYY-MM-DD'),
        notas: nuevoItem.notas || '',
      },
    ];
    setOcForm({
      ...ocForm,
      productos: updatedProductos,
      fechaEntrega: calcularFechaEntregaSugerida(updatedProductos),
    });
    setNuevoItem({
      productoId: '',
      cantidad: '',
      costoUnitario: '',
      notas: '',
    });
  };

  const handleEliminarItem = (index: number) => {
    const updated = [...ocForm.productos];
    updated.splice(index, 1);
    setOcForm({
      ...ocForm,
      productos: updated,
      fechaEntrega: calcularFechaEntregaSugerida(updated),
    });
  };

  const handleAgregarItemEdit = () => {
    if (!nuevoItemEdit.productoId || !nuevoItemEdit.cantidad || !nuevoItemEdit.costoUnitario) {
      setErrorMsg('Seleccione un producto, cantidad y costo.');
      return;
    }
    setErrorMsg(null);
    const prod = productos.find((p) => p.id === nuevoItemEdit.productoId);
    if (editarOcForm.productos.some((p: any) => p.productoId === nuevoItemEdit.productoId)) {
      setErrorMsg('Este producto ya ha sido agregado. Edite la línea correspondiente o elimínela para volver a agregarla.');
      return;
    }
    if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
      if (parseFloat(nuevoItemEdit.cantidad) % 1 !== 0) {
        setErrorMsg(`Para productos en Unidades (${prod.descripcion}), la cantidad debe ser un número entero.`);
        return;
      }
    }
    const updatedProductos = [
      ...editarOcForm.productos,
      {
        lineaNum: editarOcForm.productos.length + 1,
        productoId: nuevoItemEdit.productoId,
        productoNombre: prod ? prod.descripcion : '',
        productoSku: prod ? prod.sku : '',
        cantidad: parseFloat(nuevoItemEdit.cantidad),
        costoUnitario: parseFloat(nuevoItemEdit.costoUnitario),
        fechaEntrega: dayjs().add(prod?.leadTime || 0, 'day').format('YYYY-MM-DD'),
        notas: nuevoItemEdit.notas || '',
      },
    ];
    setEditarOcForm({
      ...editarOcForm,
      productos: updatedProductos,
      fechaEntrega: calcularFechaEntregaSugerida(updatedProductos),
    });
    setNuevoItemEdit({
      productoId: '',
      cantidad: '',
      costoUnitario: '',
      notas: '',
    });
  };

  const handleEliminarItemEdit = (index: number) => {
    const updated = [...editarOcForm.productos];
    updated.splice(index, 1);
    setEditarOcForm({
      ...editarOcForm,
      productos: updated,
      fechaEntrega: calcularFechaEntregaSugerida(updated),
    });
  };

  const handleOCSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!ocForm.proveedorId || !ocForm.sucursalId) {
        throw new Error('El proveedor y la sucursal de destino son obligatorios.');
      }
      if (ocForm.productos.length === 0) {
        throw new Error('Debe agregar al menos un producto a la orden de compra.');
      }
      const body = {
        proveedorId: ocForm.proveedorId,
        sucursalId: ocForm.sucursalId,
        fechaEntrega: ocForm.fechaEntrega || null,
        productos: ocForm.productos.map((p: any) => ({
          productoId: p.productoId,
          cantidad: p.cantidad,
          costoUnitario: p.costoUnitario,
          fechaEntrega: p.fechaEntrega || null,
          notas: p.notas || null,
        })),
      };

      await apiFetch('/compras', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setSuccessMsg('Orden de Compra registrada exitosamente.');
      setOpenOC(false);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEditarOC = (oc: any) => {
    setSelectedOC(oc);
    const lineas = oc.detalles.map((det: any) => ({
      productoId: det.productoId,
      productoNombre: det.producto.descripcion,
      productoSku: det.producto.sku,
      cantidad: det.cantidad,
      costoUnitario: det.costoUnitario,
      fechaEntrega: det.fechaEntrega ? det.fechaEntrega.split('T')[0] : '',
      notas: det.notas || '',
    }));
    setEditarOcForm({
      proveedorId: oc.proveedorId,
      sucursalId: oc.sucursalId,
      fechaEntrega: oc.fechaEntrega ? oc.fechaEntrega.split('T')[0] : '',
      productos: lineas,
      estado: oc.estado,
    });
    setNuevoItemEdit({
      productoId: '',
      cantidad: '',
      costoUnitario: '',
      notas: '',
    });
    setOpenEditarOC(true);
  };

  const handleEditarOCSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!editarOcForm.proveedorId || !editarOcForm.sucursalId) {
        throw new Error('El proveedor y la sucursal de destino son obligatorios.');
      }
      if (editarOcForm.productos.length === 0) {
        throw new Error('Debe tener al menos un producto en la orden de compra.');
      }
      await apiFetch(`/compras/${selectedOC.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          proveedorId: editarOcForm.proveedorId,
          sucursalId: editarOcForm.sucursalId,
          fechaEntrega: editarOcForm.fechaEntrega || null,
          estado: editarOcForm.estado,
          productos: editarOcForm.productos.map((p: any) => ({
            productoId: p.productoId,
            cantidad: p.cantidad,
            costoUnitario: p.costoUnitario,
            fechaEntrega: p.fechaEntrega || null,
            notas: p.notas || null,
          })),
        }),
      });
      setSuccessMsg('Orden de Compra actualizada exitosamente.');
      setOpenEditarOC(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenEliminarOC = (oc: any) => {
    setSelectedOC(oc);
    setOpenEliminarOC(true);
  };

  const handleEliminarOCSubmit = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch(`/compras/${selectedOC.id}`, {
        method: 'DELETE',
      });
      setSuccessMsg(res.message || 'Orden de Compra eliminada exitosamente.');
      setOpenEliminarOC(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleOpenPreview = (oc: any) => {
    setSelectedPreviewOC(oc);
    setOpenPreviewOC(true);
  };

  const handlePrintOC = () => {
    if (!selectedPreviewOC) return;
    const oc = selectedPreviewOC;
    const printWindow = window.open('', '_blank', 'width=850,height=700');
    if (!printWindow) {
      setErrorMsg('No se pudo abrir la ventana de impresión. Por favor, habilite los popups en su navegador.');
      return;
    }

    const fechaCreacion = new Date(oc.createdAt).toLocaleDateString('es-CO');
    const fechaEntrega = oc.fechaEntrega ? new Date(oc.fechaEntrega).toLocaleDateString('es-CO') : 'No especificada';

    let rowsHtml = '';
    oc.detalles.forEach((det: any, idx: number) => {
      const lineNum = det.lineaNum || (idx + 1);
      const subtotal = det.cantidad * det.costoUnitario;
      rowsHtml += `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #4b5563;">L${lineNum}</td>
          <td>
            <div style="font-weight: bold; color: #1e293b;">${det.producto.descripcion}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">SKU: ${det.producto.sku}</div>
            ${det.notas ? `<div style="font-size: 11px; color: #b45309; font-style: italic; margin-top: 4px; font-weight: 500;">Nota: ${det.notas}</div>` : ''}
          </td>
          <td style="text-align: center; color: #334155;">${det.cantidad}</td>
          <td style="text-align: center; text-transform: uppercase; font-size: 12px; color: #64748b;">${det.producto.unidadMedida}</td>
          <td style="text-align: right; color: #334155;">${formatCurrency(det.costoUnitario)}</td>
          <td style="text-align: right; font-weight: bold; color: #1e3a8a;">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    });

    const bankHtml = oc.proveedor.bancoNombre ? `
      <div style="font-size: 11px; color: #475569; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; background-color: #f8fafc; line-height: 1.5; margin-top: 10px; max-width: 360px;">
        <strong style="color: #334155; display: block; margin-bottom: 2px;">Datos de Transferencia Bancaria del Proveedor:</strong>
        Banco: ${oc.proveedor.bancoNombre}<br />
        Tipo Cuenta: ${oc.proveedor.bancoTipoCuenta || 'Corriente'}<br />
        Cuenta N°: ${oc.proveedor.bancoNroCuenta}<br />
        Titular: ${oc.proveedor.bancoNomTitular || oc.proveedor.nombre}
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Orden de Compra - ${oc.numeroOrden}</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #1e293b;
              margin: 40px;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 3px solid #1e3a8a;
              padding-bottom: 15px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo-area h1 {
              margin: 0;
              font-size: 26px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 0.5px;
            }
            .logo-area p {
              margin: 2px 0 0 0;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .title-area {
              text-align: right;
            }
            .title-area h2 {
              margin: 0;
              font-size: 20px;
              color: #1e3a8a;
              font-weight: 800;
            }
            .badge {
              display: inline-block;
              background-color: #1e3a8a;
              color: white;
              padding: 4px 10px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 14px;
              margin-top: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 25px;
            }
            .info-col h3 {
              margin-top: 0;
              margin-bottom: 8px;
              font-size: 12px;
              color: #1e3a8a;
              text-transform: uppercase;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .info-col p {
              margin: 0;
              font-size: 13px;
              color: #334155;
              line-height: 1.4;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 25px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .meta-box div {
              font-size: 13px;
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
              padding: 10px 8px;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            .bottom-area {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-top: 15px;
            }
            .totals-box {
              width: 250px;
            }
            .totals-box table {
              width: 100%;
              margin: 0;
            }
            .totals-box td {
              padding: 5px 0;
              border: none;
            }
            .grand-total-row td {
              border-top: 2px solid #1e3a8a !important;
              font-size: 16px;
              font-weight: 800;
              color: #1e3a8a;
              padding-top: 10px !important;
            }
            .signatures-box {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
              text-align: center;
            }
            .sig-line {
              border-top: 1px solid #475569;
              padding-top: 8px;
              margin: 0 30px;
              font-weight: 600;
              color: #334155;
            }
            .disclaimer {
              margin-top: 50px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            @media print {
              body {
                margin: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <h1>Lácteos MRP</h1>
              <p>Km 5 Vía Zipaquirá | Nit: 901.123.456-7</p>
            </div>
            <div class="title-area">
              <h2>ORDEN DE COMPRA</h2>
              <div class="badge">${oc.numeroOrden}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <h3>Proveedor</h3>
              <p>
                <strong>${oc.proveedor.nombre}</strong><br />
                Código: ${oc.proveedor.codigo}<br />
                Contacto: ${oc.proveedor.contacto}<br />
                Teléfono: ${oc.proveedor.telefono}<br />
                Email: ${oc.proveedor.correo}
              </p>
            </div>
            <div class="info-col">
              <h3>Entregar En</h3>
              <p>
                <strong>${oc.sucursal.nombre}</strong><br />
                Dirección: ${oc.sucursal.direccion}<br />
                Teléfono: ${oc.sucursal.telefono}<br />
                Email: ${oc.sucursal.correo}
              </p>
            </div>
          </div>

          <div class="meta-box">
            <div><strong>Fecha Emisión:</strong> ${fechaCreacion}</div>
            <div style="text-align: right;"><strong>Fecha Entrega:</strong> ${fechaEntrega}</div>
            <div><strong>Generado Por:</strong> ${oc.creadoPor.nombre}</div>
            <div style="text-align: right;"><strong>Estado:</strong> ${oc.estado}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Línea</th>
                <th style="text-align: left;">Descripción de Producto</th>
                <th style="width: 70px; text-align: center;">Cant.</th>
                <th style="width: 70px; text-align: center;">U.M.</th>
                <th style="width: 100px; text-align: right;">Costo Unit.</th>
                <th style="width: 120px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="bottom-area">
            <div>
              ${bankHtml}
            </div>
            <div class="totals-box">
              <table>
                <tr>
                  <td>Subtotal:</td>
                  <td style="text-align: right; font-weight: 500;">${formatCurrency(oc.total)}</td>
                </tr>
                <tr class="grand-total-row">
                  <td>TOTAL:</td>
                  <td style="text-align: right;">${formatCurrency(oc.total)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="signatures-box">
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Solicitado Por: ${oc.creadoPor.nombre}</div>
            </div>
            <div>
              <div style="height: 50px;"></div>
              <div class="sig-line">Autorizado Por: Finanzas / Gerencia</div>
            </div>
          </div>

          <div class="disclaimer">
            Este documento representa una orden de compra formal y está sujeta a los términos y condiciones de suministro acordados previamente.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenEmailModal = () => {
    if (!selectedPreviewOC) return;
    setEmailForm({
      para: selectedPreviewOC.proveedor.correo || '',
      asunto: `Orden de Compra ${selectedPreviewOC.numeroOrden} - Lácteos MRP`,
      mensajeAdicional: '',
    });
    setOpenEmailDialog(true);
  };

  const handleSendEmailSubmit = async () => {
    try {
      setIsSendingEmail(true);
      setErrorMsg(null);
      if (!emailForm.para || !emailForm.asunto) {
        throw new Error('El destinatario y el asunto son obligatorios.');
      }

      const res = await apiFetch(`/compras/${selectedPreviewOC.id}/enviar-correo`, {
        method: 'POST',
        body: JSON.stringify(emailForm),
      });

      setSuccessMsg(res.message || `Orden de compra enviada exitosamente por correo a ${emailForm.para}`);
      setOpenEmailDialog(false);
      setOpenPreviewOC(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAprobarOC = async (id: string) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/compras/${id}/aprobar`, {
        method: 'PUT',
      });
      setSuccessMsg('Orden de Compra aprobada para recepción.');
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleAbrirRecepcion = (oc: any) => {
    setSelectedOC(oc);
    // Inicializar inputs de lote para cada detalle
    const lotesInit = oc.detalles.map((det: any, idx: number) => {
      const cantRecibidaPrevia = det.cantidadRecibida || 0;
      const restante = Math.max(0, det.cantidad - cantRecibidaPrevia);
      const lineNum = det.lineaNum || (idx + 1);
      return {
        productoId: det.productoId,
        productoNombre: det.producto.descripcion,
        productoSku: det.producto.sku,
        lineaNum: lineNum,
        habilitado: false, // el operador activa manualmente las líneas a recibir
        numeroLote: `LOT-${oc.numeroOrden.replace('OC-', '')}-${det.producto.sku.replace(/-/g, '').toUpperCase()}-L${lineNum}`,
        fechaProduccion: new Date().toISOString().substring(0, 10),
        fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        tempMin: det.producto.temperaturaMin,
        tempMax: det.producto.temperaturaMax,
        cantidadOrdenada: det.cantidad,
        cantidadRecibidaPrevia: cantRecibidaPrevia,
        cantidadRecibida: restante,
      };
    });
    setRecepcionLotes(lotesInit);
    setOpenRecepcion(true);
  };

  const handleUpdateLoteInfo = (idx: number, field: string, val: any) => {
    const updated = [...recepcionLotes];
    updated[idx] = { ...updated[idx], [field]: val };
    setRecepcionLotes(updated);
  };

  const handleRecepcionSubmit = async () => {
    try {
      setErrorMsg(null);
      for (const lote of recepcionLotes) {
        const prod = productos.find((p) => p.id === lote.productoId);
        if (prod && prod.unidadMedida?.toUpperCase() === 'UNIDAD') {
          if (parseFloat(lote.cantidadRecibida) % 1 !== 0) {
            setErrorMsg(`Para el producto "${lote.productoNombre}" (Unidades), la cantidad recibida debe ser un número entero.`);
            return;
          }
        }
      }
      await apiFetch(`/compras/${selectedOC.id}/recepcion`, {
        method: 'PUT',
        body: JSON.stringify({ lotes: recepcionLotes.filter((l) => l.habilitado) }),
      });
      setSuccessMsg('Recepcion de mercadería registrada. Los lotes ya están en stock.');
      setOpenRecepcion(false);
      setSelectedOC(null);
      cargarDatos();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Abastecimiento y Compras
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Genere órdenes de compra, asigne aprobaciones de gerencia y registre recepciones y lotes de proveedores.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddShoppingCart />}
          onClick={() => {
            setOcForm({
              proveedorId: '',
              sucursalId: usuario?.sucursalId || '',
              fechaEntrega: '',
              productos: [],
            });
            setNuevoItem({
              productoId: '',
              cantidad: '',
              costoUnitario: '',
              notas: '',
            });
            setOpenOC(true);
          }}
        >
          Crear Orden de Compra
        </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          label="Buscar por Número de OC o Proveedor"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedRowId(null);
            setPage(0);
          }}
          sx={{ width: 350, backgroundColor: 'rgba(255,255,255,0.03)' }}
        />
      </Box>

      <Paper className="glass-panel" sx={{ p: 3 }}>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Orden de Compra</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Sucursal Destino</TableCell>
                <TableCell>Detalle Productos</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Fecha Solicitud</TableCell>
                <TableCell>Fecha Entrega</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                const query = searchQuery.toLowerCase();
                const filtered = compras.filter((oc) =>
                  oc.numeroOrden.toLowerCase().includes(query) ||
                  oc.proveedor.nombre.toLowerCase().includes(query) ||
                  oc.detalles.some((det: any) => det.producto.descripcion.toLowerCase().includes(query))
                );

                if (filtered.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={9} align="center">No se encontraron órdenes de compra.</TableCell>
                    </TableRow>
                  );
                }

                return filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((oc) => {
                  const isSelected = selectedRowId === oc.id;
                  return (
                    <TableRow
                      key={oc.id}
                      hover
                      onClick={() => setSelectedRowId(isSelected ? null : oc.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'inherit',
                        '&:hover': {
                          bgcolor: isSelected ? 'rgba(59, 130, 246, 0.25) !important' : undefined,
                        },
                        transition: 'background-color 0.2s ease',
                        '& .MuiTableCell-root': {
                          verticalAlign: 'top',
                        },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{oc.numeroOrden}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{oc.proveedor.nombre}</TableCell>
                      <TableCell>{oc.sucursal.nombre}</TableCell>
                      <TableCell>
                        {oc.detalles.map((det: any, idx: number) => {
                          const lineNum = det.lineaNum || (idx + 1);
                          const cantRecibida = det.cantidadRecibida || 0;
                          const cantOrdenada = det.cantidad;
                          let estadoLinea = 'PENDIENTE';
                          let colorEstado = '#3b82f6'; // azul
                          if (cantRecibida >= cantOrdenada) {
                            estadoLinea = 'RECIBIDA';
                            colorEstado = '#10b981'; // verde
                          } else if (cantRecibida > 0) {
                            estadoLinea = 'PARCIAL';
                            colorEstado = '#f59e0b'; // naranja/ámbar
                          }
                          return (
                            <div key={det.id} style={{ marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#93c5fd', marginRight: '6px' }}>L{lineNum}:</span>
                              <strong>{det.producto.descripcion}</strong> (Recibido: {cantRecibida} / {cantOrdenada})
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: `${colorEstado}22`,
                                color: colorEstado,
                                border: `1px solid ${colorEstado}44`,
                                textTransform: 'uppercase',
                                display: 'inline-block'
                              }}>
                                {estadoLinea}
                              </span>
                              <span style={{ fontSize: '0.75rem', display: 'block', color: 'rgba(255,255,255,0.6)', marginLeft: '24px' }}>
                                Entrega: {det.fechaEntrega ? new Date(det.fechaEntrega).toLocaleDateString('es-CO') : 'No especificada'} | Costo Unitario: {formatCurrency(det.costoUnitario)} | Subtotal: {formatCurrency(det.cantidad * det.costoUnitario)}
                              </span>
                            </div>
                          );
                        })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(oc.total)}</TableCell>
                      <TableCell>{new Date(oc.createdAt).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell sx={{ color: oc.fechaEntrega && new Date(oc.fechaEntrega) < new Date() && oc.estado !== 'RECIBIDA' ? 'error.main' : 'inherit' }}>
                        {oc.fechaEntrega ? new Date(oc.fechaEntrega).toLocaleDateString('es-CO') : 'No especificada'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={oc.estado}
                          color={
                            oc.estado === 'RECIBIDA'
                              ? 'success'
                              : oc.estado === 'APROBADA'
                              ? 'warning'
                              : oc.estado === 'PENDIENTE'
                              ? 'primary'
                              : 'default'
                          }
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Tooltip title="Vista Previa (Imprimir / Enviar)">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => { e.stopPropagation(); handleOpenPreview(oc); }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {oc.estado === 'PENDIENTE' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="success"
                              startIcon={<Check />}
                              onClick={(e) => { e.stopPropagation(); handleAprobarOC(oc.id); }}
                            >
                              Aprobar
                            </Button>
                          )}
                          {(oc.estado === 'APROBADA' || oc.estado === 'PARCIAL') && (
                            <Button
                              variant="contained"
                              size="small"
                              color="secondary"
                              startIcon={<LocalShipping />}
                              onClick={(e) => { e.stopPropagation(); handleAbrirRecepcion(oc); }}
                            >
                              Recibir Lotes
                            </Button>
                          )}

                          {oc.estado !== 'RECIBIDA' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR' || usuario?.rol === 'ALMACEN' || usuario?.rol === 'GERENTE_TIENDA') && (
                            <Tooltip title="Editar Orden de Compra">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditarOC(oc); }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {oc.estado !== 'RECIBIDA' && (usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'SUPERVISOR') && (
                            <Tooltip title="Eliminar Orden de Compra">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleOpenEliminarOC(oc); }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              })()}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={(() => {
            const query = searchQuery.toLowerCase();
            return compras.filter((oc) =>
              oc.numeroOrden.toLowerCase().includes(query) ||
              oc.proveedor.nombre.toLowerCase().includes(query) ||
              oc.detalles.some((det: any) => det.producto.descripcion.toLowerCase().includes(query))
            ).length;
          })()}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Órdenes por página:"
          sx={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'text.secondary',
          }}
        />
      </Paper>

      {/* MODAL CREAR ORDEN COMPRA */}
      <Dialog open={openOC} onClose={() => setOpenOC(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Crear Orden de Compra</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Cabecera */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>
                Datos Generales
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={ocForm.proveedorId}
                  label="Proveedor"
                  onChange={(e) => {
                    const newProvId = e.target.value;
                    let updatedCosto = nuevoItem.costoUnitario;
                    if (nuevoItem.productoId) {
                      const prodSelected = productos.find((p) => p.id === nuevoItem.productoId);
                      const relacionEspecifica = prodSelected?.proveedoresAsociados?.find(
                        (pa: any) => pa.proveedorId === newProvId
                      );
                      updatedCosto = relacionEspecifica 
                        ? String(relacionEspecifica.costoProveedor ?? prodSelected.costo) 
                        : (prodSelected ? String(prodSelected.costo) : '');
                    }
                    setOcForm({ ...ocForm, proveedorId: newProvId });
                    setNuevoItem({ ...nuevoItem, costoUnitario: updatedCosto });
                  }}
                >
                  {proveedores.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Sucursal Destino</InputLabel>
                <Select
                  value={ocForm.sucursalId}
                  label="Sucursal Destino"
                  onChange={(e) => setOcForm({ ...ocForm, sucursalId: e.target.value })}
                >
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                <DatePicker
                  label="Fecha Estimada de Entrega"
                  value={ocForm.fechaEntrega ? dayjs(ocForm.fechaEntrega) : null}
                  onChange={(newValue) => setOcForm({ ...ocForm, fechaEntrega: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Box>
            </Box>

            {/* Agregar Producto */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.light', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>
                Añadir Producto a la Orden
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Producto</InputLabel>
                <Select
                  value={nuevoItem.productoId}
                  label="Producto"
                  onChange={(e) => {
                    const prodId = e.target.value;
                    const prodSelected = productos.find((p) => p.id === prodId);
                    
                    // Buscar proveedor predeterminado
                    const relacionDefault = prodSelected?.proveedoresAsociados?.find(
                      (pa: any) => pa.esPredeterminado === true
                    );

                    // Si hay proveedor predeterminado y la OC no tiene proveedor, auto-seleccionarlo
                    let actualProveedorId = ocForm.proveedorId;
                    if (relacionDefault && !ocForm.proveedorId) {
                      actualProveedorId = relacionDefault.proveedorId;
                      setOcForm((prev: any) => ({
                        ...prev,
                        proveedorId: relacionDefault.proveedorId
                      }));
                    }

                    // Calcular costo correspondiente
                    const relacionEspecifica = prodSelected?.proveedoresAsociados?.find(
                      (pa: any) => pa.proveedorId === actualProveedorId
                    );
                    const costoSugerido = relacionEspecifica?.costoProveedor ?? prodSelected?.costo ?? 0;

                    setNuevoItem({
                      ...nuevoItem,
                      productoId: prodId,
                      costoUnitario: String(costoSugerido),
                    });
                  }}
                >
                  {productos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.descripcion} (Costo: {formatCurrency(p.costo)} | Lead Time: {p.leadTime} días)</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  size="small"
                  value={nuevoItem.cantidad}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Costo Unitario"
                  type="number"
                  size="small"
                  value={nuevoItem.costoUnitario}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, costoUnitario: e.target.value })}
                />
              </Box>

              <TextField
                fullWidth
                label="Notas / Comentarios de esta línea"
                size="small"
                value={nuevoItem.notas}
                onChange={(e) => setNuevoItem({ ...nuevoItem, notas: e.target.value })}
                placeholder="Ej. Embalaje especial, entrega urgente, lote sugerido..."
              />

              <Button
                variant="outlined"
                color="primary"
                onClick={handleAgregarItem}
                fullWidth
              >
                Añadir Línea
              </Button>
            </Box>
          </Box>

          {/* Tabla de Items */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Productos Solicitados ({ocForm.productos.length})
          </Typography>
          <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'transparent' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Línea</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Costo Unitario</TableCell>
                  <TableCell align="center">Fecha de Entrega</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ocForm.productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No se han agregado productos a la orden. Use el formulario superior para añadir líneas.
                    </TableCell>
                  </TableRow>
                ) : (
                  ocForm.productos.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.light', fontSize: '0.85rem' }}>L{item.lineaNum || idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {item.productoNombre}
                        <TextField
                          placeholder="Notas de esta línea"
                          size="small"
                          fullWidth
                          value={item.notas || ''}
                          onChange={(e) => {
                            const updated = [...ocForm.productos];
                            updated[idx].notas = e.target.value;
                            setOcForm({
                              ...ocForm,
                              productos: updated,
                            });
                          }}
                          sx={{ mt: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </TableCell>
                      <TableCell>{item.productoSku}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.cantidad}
                          onChange={(e) => {
                            const updated = [...ocForm.productos];
                            updated[idx].cantidad = parseFloat(e.target.value) || 0;
                            setOcForm({
                              ...ocForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 80,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem', textAlign: 'right' }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.costoUnitario}
                          onChange={(e) => {
                            const updated = [...ocForm.productos];
                            updated[idx].costoUnitario = parseFloat(e.target.value) || 0;
                            setOcForm({
                              ...ocForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 100,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem', textAlign: 'right' }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="date"
                          size="small"
                          value={item.fechaEntrega}
                          onChange={(e) => {
                            const updated = [...ocForm.productos];
                            updated[idx].fechaEntrega = e.target.value;
                            setOcForm({
                              ...ocForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 145,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' }
                          }}
                        />
                      </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(item.cantidad * item.costoUnitario)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleEliminarItem(idx)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {ocForm.productos.length > 0 && (
                  <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <TableCell colSpan={6} align="right" sx={{ fontWeight: 700 }}>Total Estimado:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.light', fontSize: '1rem' }}>
                      {formatCurrency(ocForm.productos.reduce((sum: number, p: any) => sum + (p.cantidad * p.costoUnitario), 0))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenOC(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleOCSubmit}>Emitir Orden</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL REGISTRAR RECEPCION DE OC CON LOTES */}
      <Dialog open={openRecepcion} onClose={() => setOpenRecepcion(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FactCheck color="secondary" /> Recepción y Creación de Lote Trazable - OC {selectedOC?.numeroOrden}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Especifique los datos de control del lote ingresante de cada producto para asegurar el monitoreo de cadena de frío y vencimientos (FEFO).
          </Typography>

          {recepcionLotes.map((lote, index) => (
            <Box
              key={index}
              sx={{
                mb: 4, p: 2, borderRadius: 2,
                backgroundColor: lote.habilitado ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
                border: lote.habilitado ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                opacity: lote.habilitado ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: lote.habilitado ? 'primary.light' : 'text.disabled' }}>
                  Línea {lote.lineaNum}: {lote.productoNombre}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color={lote.habilitado ? 'text.secondary' : 'text.disabled'}>
                    {lote.habilitado ? 'Recibir esta línea' : 'No recibir'}
                  </Typography>
                  <Switch
                    checked={lote.habilitado}
                    onChange={(e) => handleUpdateLoteInfo(index, 'habilitado', e.target.checked)}
                    color="primary"
                    size="small"
                    disabled={lote.cantidadRecibidaPrevia >= lote.cantidadOrdenada}
                  />
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Cantidad Ordenada: <strong>{lote.cantidadOrdenada}</strong> | Recibida anteriormente: <strong>{lote.cantidadRecibidaPrevia}</strong> | Restante: <strong>{lote.cantidadOrdenada - lote.cantidadRecibidaPrevia}</strong>
              </Typography>
              {lote.habilitado && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <TextField
                      fullWidth
                      label="Código de Lote"
                      size="small"
                      value={lote.numeroLote}
                      onChange={(e) => handleUpdateLoteInfo(index, 'numeroLote', e.target.value)}
                    />
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <DatePicker
                      label="Fecha Producción"
                      value={lote.fechaProduccion ? dayjs(lote.fechaProduccion) : null}
                      onChange={(newValue) => handleUpdateLoteInfo(index, 'fechaProduccion', newValue ? newValue.format('YYYY-MM-DD') : '')}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <DatePicker
                      label="Fecha Vencimiento"
                      value={lote.fechaVencimiento ? dayjs(lote.fechaVencimiento) : null}
                      onChange={(newValue) => handleUpdateLoteInfo(index, 'fechaVencimiento', newValue ? newValue.format('YYYY-MM-DD') : '')}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Temperatura Mín (°C)"
                      type="number"
                      size="small"
                      value={lote.tempMin}
                      onChange={(e) => handleUpdateLoteInfo(index, 'tempMin', e.target.value)}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Temperatura Máx (°C)"
                      type="number"
                      size="small"
                      value={lote.tempMax}
                      onChange={(e) => handleUpdateLoteInfo(index, 'tempMax', e.target.value)}
                    />
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Cantidad Recibida"
                      type="number"
                      size="small"
                      value={lote.cantidadRecibida}
                      onChange={(e) => handleUpdateLoteInfo(index, 'cantidadRecibida', e.target.value)}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenRecepcion(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleRecepcionSubmit}>Confirmar Recepción</Button>
        </DialogActions>
      </Dialog>
      {/* DIALOG: EDITAR ORDEN COMPRA */}
      <Dialog open={openEditarOC} onClose={() => { setOpenEditarOC(false); setSelectedOC(null); }} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>Editar Orden de Compra {selectedOC?.numeroOrden}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Cabecera */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>
                Datos Generales
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Proveedor</InputLabel>
                <Select
                  value={editarOcForm.proveedorId}
                  label="Proveedor"
                  onChange={(e) => {
                    const newProvId = e.target.value;
                    let updatedCosto = nuevoItemEdit.costoUnitario;
                    if (nuevoItemEdit.productoId) {
                      const prodSelected = productos.find((p) => p.id === nuevoItemEdit.productoId);
                      const relacionEspecifica = prodSelected?.proveedoresAsociados?.find(
                        (pa: any) => pa.proveedorId === newProvId
                      );
                      updatedCosto = relacionEspecifica 
                        ? String(relacionEspecifica.costoProveedor ?? prodSelected.costo) 
                        : (prodSelected ? String(prodSelected.costo) : '');
                    }
                    setEditarOcForm({ ...editarOcForm, proveedorId: newProvId });
                    setNuevoItemEdit({ ...nuevoItemEdit, costoUnitario: updatedCosto });
                  }}
                >
                  {proveedores.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Sucursal Destino</InputLabel>
                <Select
                  value={editarOcForm.sucursalId}
                  label="Sucursal Destino"
                  onChange={(e) => setEditarOcForm({ ...editarOcForm, sucursalId: e.target.value })}
                >
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={editarOcForm.estado || ''}
                  label="Estado"
                  onChange={(e) => setEditarOcForm({ ...editarOcForm, estado: e.target.value })}
                >
                  <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                  <MenuItem value="APROBADA">APROBADA</MenuItem>
                  <MenuItem value="PARCIAL">PARCIAL</MenuItem>
                  <MenuItem value="RECIBIDA">RECIBIDA</MenuItem>
                  <MenuItem value="CANCELADA">CANCELADA</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                <DatePicker
                  label="Fecha Estimada de Entrega"
                  value={editarOcForm.fechaEntrega ? dayjs(editarOcForm.fechaEntrega) : null}
                  onChange={(newValue) => setEditarOcForm({ ...editarOcForm, fechaEntrega: newValue ? newValue.format('YYYY-MM-DD') : '' })}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Box>
            </Box>

            {/* Agregar Producto */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.light', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>
                Añadir Producto a la Orden
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Producto</InputLabel>
                <Select
                  value={nuevoItemEdit.productoId}
                  label="Producto"
                  onChange={(e) => {
                    const prodId = e.target.value;
                    const prodSelected = productos.find((p) => p.id === prodId);
                    
                    // Buscar proveedor predeterminado
                    const relacionDefault = prodSelected?.proveedoresAsociados?.find(
                      (pa: any) => pa.esPredeterminado === true
                    );

                    // Si hay proveedor predeterminado y la OC no tiene proveedor, auto-seleccionarlo
                    let actualProveedorId = editarOcForm.proveedorId;
                    if (relacionDefault && !editarOcForm.proveedorId) {
                      actualProveedorId = relacionDefault.proveedorId;
                      setEditarOcForm((prev: any) => ({
                        ...prev,
                        proveedorId: relacionDefault.proveedorId
                      }));
                    }

                    // Calcular costo correspondiente
                    const relacionEspecifica = prodSelected?.proveedoresAsociados?.find(
                      (pa: any) => pa.proveedorId === actualProveedorId
                    );
                    const costoSugerido = relacionEspecifica?.costoProveedor ?? prodSelected?.costo ?? 0;

                    setNuevoItemEdit({
                      ...nuevoItemEdit,
                      productoId: prodId,
                      costoUnitario: String(costoSugerido),
                    });
                  }}
                >
                  {productos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.descripcion} (Costo: {formatCurrency(p.costo)} | Lead Time: {p.leadTime} días)</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  size="small"
                  value={nuevoItemEdit.cantidad}
                  onChange={(e) => setNuevoItemEdit({ ...nuevoItemEdit, cantidad: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Costo Unitario"
                  type="number"
                  size="small"
                  value={nuevoItemEdit.costoUnitario}
                  onChange={(e) => setNuevoItemEdit({ ...nuevoItemEdit, costoUnitario: e.target.value })}
                />
              </Box>

              <TextField
                fullWidth
                label="Notas / Comentarios de esta línea"
                size="small"
                value={nuevoItemEdit.notas}
                onChange={(e) => setNuevoItemEdit({ ...nuevoItemEdit, notas: e.target.value })}
                placeholder="Ej. Embalaje especial, entrega urgente, lote sugerido..."
              />

              <Button
                variant="outlined"
                color="primary"
                onClick={handleAgregarItemEdit}
                fullWidth
              >
                Añadir Línea
              </Button>
            </Box>
          </Box>

          {/* Tabla de Items */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Productos Solicitados ({editarOcForm.productos.length})
          </Typography>
          <Paper sx={{ p: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'transparent' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>Línea</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Costo Unitario</TableCell>
                  <TableCell align="center">Fecha de Entrega</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editarOcForm.productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No hay productos en esta orden de compra. Añada líneas usando el formulario.
                    </TableCell>
                  </TableRow>
                ) : (
                  editarOcForm.productos.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.light', fontSize: '0.85rem' }}>L{item.lineaNum || idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {item.productoNombre}
                        <TextField
                          placeholder="Notas de esta línea"
                          size="small"
                          fullWidth
                          value={item.notas || ''}
                          onChange={(e) => {
                            const updated = [...editarOcForm.productos];
                            updated[idx].notas = e.target.value;
                            setEditarOcForm({
                              ...editarOcForm,
                              productos: updated,
                            });
                          }}
                          sx={{ mt: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </TableCell>
                      <TableCell>{item.productoSku}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.cantidad}
                          onChange={(e) => {
                            const updated = [...editarOcForm.productos];
                            updated[idx].cantidad = parseFloat(e.target.value) || 0;
                            setEditarOcForm({
                              ...editarOcForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 80,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem', textAlign: 'right' }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.costoUnitario}
                          onChange={(e) => {
                            const updated = [...editarOcForm.productos];
                            updated[idx].costoUnitario = parseFloat(e.target.value) || 0;
                            setEditarOcForm({
                              ...editarOcForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 100,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem', textAlign: 'right' }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="date"
                          size="small"
                          value={item.fechaEntrega}
                          onChange={(e) => {
                            const updated = [...editarOcForm.productos];
                            updated[idx].fechaEntrega = e.target.value;
                            setEditarOcForm({
                              ...editarOcForm,
                              productos: updated,
                              fechaEntrega: calcularFechaEntregaSugerida(updated),
                            });
                          }}
                          sx={{
                            width: 145,
                            '& .MuiInputBase-input': { py: 0.5, fontSize: '0.875rem' }
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(item.cantidad * item.costoUnitario)}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleEliminarItemEdit(idx)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {editarOcForm.productos.length > 0 && (
                  <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <TableCell colSpan={6} align="right" sx={{ fontWeight: 700 }}>Total Estimado:</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.light', fontSize: '1rem' }}>
                      {formatCurrency(editarOcForm.productos.reduce((sum: number, p: any) => sum + (p.cantidad * p.costoUnitario), 0))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEditarOC(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditarOCSubmit}>Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRMAR ELIMINACIÓN DE ORDEN COMPRA */}
      <Dialog open={openEliminarOC} onClose={() => { setOpenEliminarOC(false); setSelectedOC(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Eliminar Orden de Compra?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOC && (
            <Typography variant="body1">
              ¿Está seguro que desea eliminar la orden de compra <strong>{selectedOC.numeroOrden}</strong>?
              <br /><br />
              Esta acción no se puede deshacer y fallará si la orden ya ha sido recibida.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpenEliminarOC(false); setSelectedOC(null); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleEliminarOCSubmit}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: VISTA PREVIA DE ORDEN COMPRA */}
      <Dialog
        open={openPreviewOC}
        onClose={() => { setOpenPreviewOC(false); setSelectedPreviewOC(null); }}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }
          }
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            color: 'white',
            px: 3,
            py: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, m: 0 }}>Vista Previa de Orden de Compra</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Lácteos MRP - Sistema ERP</Typography>
            </Box>
            <IconButton onClick={() => { setOpenPreviewOC(false); setSelectedPreviewOC(null); }} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedPreviewOC && (
            <Box>
              {/* Document Header Area */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, pb: 3, borderBottom: '2px solid rgba(255,255,255,0.05)' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.light' }}>LÁCTEOS MRP</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Nit: 901.123.456-7</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Km 5 Vía Zipaquirá</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Teléfono: +57 (601) 823-4567</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedPreviewOC.numeroOrden}</Typography>
                  <Chip
                    label={selectedPreviewOC.estado}
                    color={
                      selectedPreviewOC.estado === 'RECIBIDA'
                        ? 'success'
                        : selectedPreviewOC.estado === 'APROBADA'
                        ? 'warning'
                        : selectedPreviewOC.estado === 'PENDIENTE'
                        ? 'primary'
                        : 'default'
                    }
                    size="small"
                    sx={{ fontWeight: 700, mt: 0.5 }}
                  />
                </Box>
              </Box>

              {/* Flex container with Supplier and Sucursal */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4 }}>
                <Card variant="outlined" sx={{ p: 2, flex: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.light', borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 0.5, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Proveedor
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedPreviewOC.proveedor.nombre}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}><strong>Código:</strong> {selectedPreviewOC.proveedor.codigo}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}><strong>Contacto:</strong> {selectedPreviewOC.proveedor.contacto}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}><strong>Teléfono:</strong> {selectedPreviewOC.proveedor.telefono}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}><strong>Email:</strong> {selectedPreviewOC.proveedor.correo}</Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2, flex: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.light', borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 0.5, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Entregar En (Sucursal)
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{selectedPreviewOC.sucursal.nombre}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}><strong>Dirección:</strong> {selectedPreviewOC.sucursal.direccion}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}><strong>Teléfono:</strong> {selectedPreviewOC.sucursal.telefono}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}><strong>Email:</strong> {selectedPreviewOC.sucursal.correo}</Typography>
                </Card>
              </Box>

              {/* General Metadata Box */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                mb: 4,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Fecha de Emisión:</strong> {new Date(selectedPreviewOC.createdAt).toLocaleDateString('es-CO')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: { sm: 'right' } }}>
                  <strong>Fecha Estimada Entrega:</strong> {selectedPreviewOC.fechaEntrega ? new Date(selectedPreviewOC.fechaEntrega).toLocaleDateString('es-CO') : 'No especificada'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Generado Por:</strong> {selectedPreviewOC.creadoPor.nombre}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: { sm: 'right' } }}>
                  <strong>Condiciones:</strong> {selectedPreviewOC.proveedor.bancoNombre ? 'Transferencia Bancaria' : 'Según acuerdo'}
                </Typography>
              </Box>

              {/* Items Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}>
                Detalle de Productos Solicitados
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.08)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.selected' }}>
                      <TableCell sx={{ fontWeight: 800, width: 60, textAlign: 'center' }}>Línea</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 80, align: 'center' }}>Cant.</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 80, align: 'center' }}>U.M.</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: 120 }}>Costo Unit.</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right', width: 130 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPreviewOC.detalles.map((det: any, idx: number) => {
                      const lineNum = det.lineaNum || (idx + 1);
                      return (
                        <TableRow key={det.id} hover>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}>L{lineNum}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{det.producto.descripcion}</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>SKU: {det.producto.sku}</Typography>
                              {det.notas && (
                                <Typography variant="caption" sx={{ color: 'warning.light', fontStyle: 'italic', fontWeight: 500 }}>
                                  Nota: {det.notas}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">{det.cantidad}</TableCell>
                          <TableCell align="center" sx={{ textTransform: 'uppercase', fontSize: '0.8rem', color: 'text.secondary' }}>{det.producto.unidadMedida}</TableCell>
                          <TableCell align="right">{formatCurrency(det.costoUnitario)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.light' }}>{formatCurrency(det.cantidad * det.costoUnitario)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals and Bank details */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: { md: 320 } }}>
                  {selectedPreviewOC.proveedor.bancoNombre && (
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed rgba(255,255,255,0.15)', bgcolor: 'action.hover' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5, color: 'text.secondary', textTransform: 'uppercase' }}>
                        Datos de Transferencia del Proveedor:
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        <strong>Banco:</strong> {selectedPreviewOC.proveedor.bancoNombre}<br />
                        <strong>Tipo:</strong> {selectedPreviewOC.proveedor.bancoTipoCuenta || 'Corriente'}<br />
                        <strong>Cuenta N°:</strong> {selectedPreviewOC.proveedor.bancoNroCuenta}<br />
                        <strong>Titular:</strong> {selectedPreviewOC.proveedor.bancoNomTitular || selectedPreviewOC.proveedor.nombre}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', minWidth: 280 }}>
                  <Box sx={{ width: '100%', maxWidth: 280 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Subtotal:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(selectedPreviewOC.total)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1, borderColor: 'primary.main', borderWidth: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.light' }}>TOTAL:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.light' }}>{formatCurrency(selectedPreviewOC.total)}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'action.hover', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => { setOpenPreviewOC(false); setSelectedPreviewOC(null); }}
          >
            Cerrar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Print />}
            onClick={handlePrintOC}
          >
            Imprimir
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Email />}
            onClick={handleOpenEmailModal}
          >
            Enviar por Correo
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ENVIAR ORDEN COMPRA POR CORREO */}
      <Dialog
        open={openEmailDialog}
        onClose={() => setOpenEmailDialog(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Enviar Orden de Compra por Correo</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Configure los detalles del correo electrónico que se enviará al proveedor con el formato corporativo.
          </Typography>
          <TextField
            label="Destinatario"
            fullWidth
            size="small"
            required
            placeholder="correo@proveedor.com"
            value={emailForm.para}
            onChange={(e) => setEmailForm({ ...emailForm, para: e.target.value })}
          />
          <TextField
            label="Asunto"
            fullWidth
            size="small"
            required
            value={emailForm.asunto}
            onChange={(e) => setEmailForm({ ...emailForm, asunto: e.target.value })}
          />
          <TextField
            label="Mensaje Adicional / Comentarios"
            fullWidth
            multiline
            rows={4}
            size="small"
            placeholder="Ingrese instrucciones adicionales o un saludo para el proveedor..."
            value={emailForm.mensajeAdicional}
            onChange={(e) => setEmailForm({ ...emailForm, mensajeAdicional: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenEmailDialog(false)} disabled={isSendingEmail}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSendEmailSubmit}
            disabled={isSendingEmail}
          >
            {isSendingEmail ? 'Enviando...' : 'Enviar Correo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
