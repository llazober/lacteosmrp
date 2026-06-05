import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller()
export class ProductosController {
  constructor(private prisma: PrismaService) {}

  // --- PRODUCTOS ---
  @Get('productos')
  async listarProductos() {
    return this.prisma.producto.findMany({
      orderBy: { descripcion: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('productos')
  async crearProducto(@Request() req: any, @Body() body: any) {
    const {
      sku,
      codigoBarras,
      descripcion,
      categoria,
      tipoProducto,
      marca,
      unidadMedida,
      costo,
      precioVenta,
      iva,
      temperaturaMin,
      temperaturaMax,
      vidaUtilDias,
    } = body;

    if (
      !sku ||
      !codigoBarras ||
      !descripcion ||
      !categoria ||
      costo == null ||
      precioVenta == null
    ) {
      throw new BadRequestException(
        'Los campos sku, código de barras, descripción, categoría, costo y precio de venta son obligatorios.',
      );
    }

    const existSku = await this.prisma.producto.findUnique({ where: { sku } });
    if (existSku) {
      throw new BadRequestException(
        'Ya existe un producto con el SKU ingresado.',
      );
    }

    const existBar = await this.prisma.producto.findUnique({
      where: { codigoBarras },
    });
    if (existBar) {
      throw new BadRequestException(
        'Ya existe un producto con el código de barras ingresado.',
      );
    }

    const producto = await this.prisma.producto.create({
      data: {
        sku,
        codigoBarras,
        descripcion,
        categoria,
        tipoProducto: tipoProducto || 'PRODUCTO_TERMINADO',
        marca: marca || '',
        unidadMedida: unidadMedida || 'UNIDAD',
        costo: parseFloat(costo),
        precioVenta: parseFloat(precioVenta),
        iva: iva != null ? parseFloat(iva) : 0.19,
        temperaturaMin: parseFloat(temperaturaMin || 2.0),
        temperaturaMax: parseFloat(temperaturaMax || 6.0),
        vidaUtilDias: parseInt(vidaUtilDias || 30),
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_PRODUCTO',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(producto),
      },
    });

    return producto;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('productos/:id')
  async actualizarProducto(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const {
      descripcion,
      categoria,
      tipoProducto,
      marca,
      unidadMedida,
      costo,
      precioVenta,
      iva,
      temperaturaMin,
      temperaturaMax,
      vidaUtilDias,
      estado,
    } = body;

    const producto = await this.prisma.producto.update({
      where: { id },
      data: {
        descripcion,
        categoria,
        marca,
        unidadMedida,
        costo: costo != null ? parseFloat(costo) : undefined,
        precioVenta: precioVenta != null ? parseFloat(precioVenta) : undefined,
        iva: iva != null ? parseFloat(iva) : undefined,
        temperaturaMin:
          temperaturaMin != null ? parseFloat(temperaturaMin) : undefined,
        temperaturaMax:
          temperaturaMax != null ? parseFloat(temperaturaMax) : undefined,
        vidaUtilDias: vidaUtilDias != null ? parseInt(vidaUtilDias) : undefined,
        estado,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_PRODUCTO',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(producto),
      },
    });

    return producto;
  }

  // --- PROVEEDORES ---
  @Get('proveedores')
  async listarProveedores() {
    return this.prisma.proveedor.findMany({
      include: { terminoPago: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('proveedores')
  async crearProveedor(@Request() req: any, @Body() body: any) {
    const {
      codigo,
      nombre,
      contacto,
      telefono,
      correo,
      certificaciones,
      terminoPagoId,
      bancoNombre,
      bancoTipoCuenta,
      bancoNroCuenta,
      bancoRutTitular,
      bancoNomTitular,
    } = body;

    if (!codigo || !nombre) {
      throw new BadRequestException(
        'El código y el nombre del proveedor son obligatorios.',
      );
    }

    const exist = await this.prisma.proveedor.findUnique({ where: { codigo } });
    if (exist) {
      throw new BadRequestException('Ya existe un proveedor con ese código.');
    }

    const proveedor = await this.prisma.proveedor.create({
      data: {
        codigo,
        nombre,
        contacto: contacto || '',
        telefono: telefono || '',
        correo: correo || '',
        certificaciones: certificaciones
          ? JSON.stringify(certificaciones)
          : '[]',
        terminoPagoId: terminoPagoId || null,
        bancoNombre: bancoNombre || null,
        bancoTipoCuenta: bancoTipoCuenta || null,
        bancoNroCuenta: bancoNroCuenta || null,
        bancoRutTitular: bancoRutTitular || null,
        bancoNomTitular: bancoNomTitular || null,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_PROVEEDOR',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(proveedor),
      },
    });

    return proveedor;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('proveedores/:id')
  async actualizarProveedor(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const {
      nombre,
      contacto,
      telefono,
      correo,
      certificaciones,
      estado,
      terminoPagoId,
      bancoNombre,
      bancoTipoCuenta,
      bancoNroCuenta,
      bancoRutTitular,
      bancoNomTitular,
    } = body;

    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: {
        nombre,
        contacto,
        telefono,
        correo,
        certificaciones: certificaciones
          ? JSON.stringify(certificaciones)
          : undefined,
        estado,
        terminoPagoId:
          terminoPagoId !== undefined ? terminoPagoId || null : undefined,
        bancoNombre:
          bancoNombre !== undefined ? bancoNombre || null : undefined,
        bancoTipoCuenta:
          bancoTipoCuenta !== undefined ? bancoTipoCuenta || null : undefined,
        bancoNroCuenta:
          bancoNroCuenta !== undefined ? bancoNroCuenta || null : undefined,
        bancoRutTitular:
          bancoRutTitular !== undefined ? bancoRutTitular || null : undefined,
        bancoNomTitular:
          bancoNomTitular !== undefined ? bancoNomTitular || null : undefined,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_PROVEEDOR',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(proveedor),
      },
    });

    return proveedor;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Delete('proveedores/:id')
  async eliminarProveedor(@Param('id') id: string, @Request() req: any) {
    const proveedor = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      throw new BadRequestException('El proveedor no existe.');
    }

    const lotesCount = await this.prisma.lote.count({
      where: { proveedorId: id },
    });
    const ocCount = await this.prisma.ordenCompra.count({
      where: { proveedorId: id },
    });

    if (lotesCount > 0 || ocCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar el proveedor porque posee lotes u órdenes de compra asociadas en el historial.',
      );
    }

    await this.prisma.proveedor.delete({ where: { id } });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_PROVEEDOR',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(proveedor),
      },
    });

    return { success: true, message: 'Proveedor eliminado con éxito.' };
  }

  // --- CATEGORIAS ---
  @Get('categorias')
  async listarCategorias() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('categorias')
  async crearCategoria(@Request() req: any, @Body() body: any) {
    const { nombre, tipoProducto } = body;
    if (!nombre) {
      throw new BadRequestException(
        'El nombre de la categoría es obligatorio.',
      );
    }

    const normNombre = nombre.trim().toUpperCase();
    const exist = await this.prisma.categoria.findUnique({
      where: { nombre: normNombre },
    });
    if (exist) {
      throw new BadRequestException('Ya existe una categoría con ese nombre.');
    }

    const categoria = await this.prisma.categoria.create({
      data: {
        nombre: normNombre,
        tipoProducto: tipoProducto || 'PRODUCTO_TERMINADO',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_CATEGORIA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(categoria),
      },
    });

    return categoria;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('categorias/:id')
  async actualizarCategoria(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { nombre, tipoProducto } = body;
    if (!nombre) {
      throw new BadRequestException(
        'El nombre de la categoría es obligatorio.',
      );
    }

    const normNombre = nombre.trim().toUpperCase();

    // Verificar unicidad excluyendo la actual
    const exist = await this.prisma.categoria.findFirst({
      where: {
        nombre: normNombre,
        id: { not: id },
      },
    });
    if (exist) {
      throw new BadRequestException('Ya existe otra categoría con ese nombre.');
    }

    const oldCategoria = await this.prisma.categoria.findUnique({
      where: { id },
    });
    if (!oldCategoria) {
      throw new BadRequestException('La categoría no existe.');
    }

    const categoria = await this.prisma.categoria.update({
      where: { id },
      data: {
        nombre: normNombre,
        tipoProducto: tipoProducto || 'PRODUCTO_TERMINADO',
      },
    });

    // Sincronizar todos los productos con el nuevo nombre de categoría y el nuevo tipoProducto
    await this.prisma.producto.updateMany({
      where: { categoria: oldCategoria.nombre },
      data: {
        categoria: normNombre,
        tipoProducto: tipoProducto || 'PRODUCTO_TERMINADO',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_CATEGORIA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(categoria),
      },
    });

    return categoria;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Delete('categorias/:id')
  async eliminarCategoria(@Param('id') id: string, @Request() req: any) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) {
      throw new BadRequestException('La categoría no existe.');
    }

    const prodCount = await this.prisma.producto.count({
      where: { categoria: categoria.nombre },
    });
    if (prodCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar la categoría porque hay productos asociados a ella.',
      );
    }

    await this.prisma.categoria.delete({
      where: { id },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_CATEGORIA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(categoria),
      },
    });

    return { message: 'Categoría eliminada con éxito.' };
  }

  // --- UNIDADES DE MEDIDA ---
  @Get('productos/unidades-medida')
  async listarUnidadesMedida() {
    return this.prisma.unidadMedida.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('productos/unidades-medida')
  async crearUnidadMedida(@Request() req: any, @Body() body: any) {
    const { nombre, abreviacion } = body;
    if (!nombre || !abreviacion) {
      throw new BadRequestException(
        'El nombre y la abreviación son obligatorios.',
      );
    }

    const normNombre = nombre.trim().toUpperCase();
    const normAbrev = abreviacion.trim().toUpperCase();
    const exist = await this.prisma.unidadMedida.findUnique({
      where: { nombre: normNombre },
    });
    if (exist) {
      throw new BadRequestException(
        'Ya existe una unidad de medida con ese nombre.',
      );
    }

    const unidad = await this.prisma.unidadMedida.create({
      data: { nombre: normNombre, abreviacion: normAbrev },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_UNIDAD_MEDIDA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(unidad),
      },
    });

    return unidad;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('productos/unidades-medida/:id')
  async actualizarUnidadMedida(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { nombre, abreviacion } = body;
    if (!nombre || !abreviacion) {
      throw new BadRequestException(
        'El nombre y la abreviación son obligatorios.',
      );
    }

    const normNombre = nombre.trim().toUpperCase();
    const normAbrev = abreviacion.trim().toUpperCase();

    // Verificar unicidad excluyendo la actual
    const exist = await this.prisma.unidadMedida.findFirst({
      where: {
        nombre: normNombre,
        id: { not: id },
      },
    });
    if (exist) {
      throw new BadRequestException(
        'Ya existe otra unidad de medida con ese nombre.',
      );
    }

    const oldUnidad = await this.prisma.unidadMedida.findUnique({
      where: { id },
    });
    if (!oldUnidad) {
      throw new BadRequestException('La unidad de medida no existe.');
    }

    const unidad = await this.prisma.unidadMedida.update({
      where: { id },
      data: { nombre: normNombre, abreviacion: normAbrev },
    });

    // Sincronizar todos los productos con el nuevo nombre de unidad de medida
    await this.prisma.producto.updateMany({
      where: { unidadMedida: oldUnidad.nombre },
      data: { unidadMedida: normNombre },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_UNIDAD_MEDIDA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(unidad),
      },
    });

    return unidad;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Delete('productos/unidades-medida/:id')
  async eliminarUnidadMedida(@Param('id') id: string, @Request() req: any) {
    const unidad = await this.prisma.unidadMedida.findUnique({ where: { id } });
    if (!unidad) {
      throw new BadRequestException('La unidad de medida no existe.');
    }

    const prodCount = await this.prisma.producto.count({
      where: { unidadMedida: unidad.nombre },
    });
    if (prodCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar la unidad de medida porque hay productos asociados a ella.',
      );
    }

    await this.prisma.unidadMedida.delete({
      where: { id },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_UNIDAD_MEDIDA',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(unidad),
      },
    });

    return { message: 'Unidad de medida eliminada con éxito.' };
  }

  // --- TIPOS DE PRODUCTO ---
  @Get('productos/tipos')
  async listarTiposProducto() {
    return this.prisma.tipoProducto.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('productos/tipos')
  async crearTipoProducto(@Request() req: any, @Body() body: any) {
    const { nombre, descripcion, metadata } = body;
    if (!nombre || !descripcion) {
      throw new BadRequestException(
        'El nombre y la descripción son obligatorios.',
      );
    }

    const normNombre = nombre.trim().toUpperCase().replace(/\s+/g, '_');
    const exist = await this.prisma.tipoProducto.findUnique({
      where: { nombre: normNombre },
    });
    if (exist) {
      throw new BadRequestException(
        'Ya existe un tipo de producto con ese nombre/código.',
      );
    }

    const tipo = await this.prisma.tipoProducto.create({
      data: {
        nombre: normNombre,
        descripcion,
        metadata: metadata || '',
      },
    });

    // Auditoría
    const userExists = req.user?.id
      ? await this.prisma.usuario.findUnique({ where: { id: req.user.id } })
      : null;
    await this.prisma.auditoria.create({
      data: {
        usuarioId: userExists ? req.user.id : null,
        usuarioNombre: req.user.nombre || 'Sistema',
        accion: 'CREAR_TIPO_PRODUCTO',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(tipo),
      },
    });

    return tipo;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('productos/tipos/:id')
  async actualizarTipoProducto(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { nombre, descripcion, metadata } = body;
    if (!nombre || !descripcion) {
      throw new BadRequestException(
        'El nombre y la descripción son obligatorios.',
      );
    }

    const normNombre = nombre.trim().toUpperCase().replace(/\s+/g, '_');

    // Verificar unicidad excluyendo el actual
    const exist = await this.prisma.tipoProducto.findFirst({
      where: {
        nombre: normNombre,
        id: { not: id },
      },
    });
    if (exist) {
      throw new BadRequestException(
        'Ya existe otro tipo de producto con ese nombre/código.',
      );
    }

    const oldTipo = await this.prisma.tipoProducto.findUnique({
      where: { id },
    });
    if (!oldTipo) {
      throw new BadRequestException('El tipo de producto no existe.');
    }

    const tipo = await this.prisma.tipoProducto.update({
      where: { id },
      data: {
        nombre: normNombre,
        descripcion,
        metadata: metadata || '',
      },
    });

    // Sincronizar todos los productos con el nuevo nombre del tipo de producto
    await this.prisma.producto.updateMany({
      where: { tipoProducto: oldTipo.nombre },
      data: { tipoProducto: normNombre },
    });

    // Sincronizar todas las categorías con el nuevo nombre del tipo de producto
    await this.prisma.categoria.updateMany({
      where: { tipoProducto: oldTipo.nombre },
      data: { tipoProducto: normNombre },
    });

    // Auditoría
    const userExists = req.user?.id
      ? await this.prisma.usuario.findUnique({ where: { id: req.user.id } })
      : null;
    await this.prisma.auditoria.create({
      data: {
        usuarioId: userExists ? req.user.id : null,
        usuarioNombre: req.user.nombre || 'Sistema',
        accion: 'ACTUALIZAR_TIPO_PRODUCTO',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(tipo),
      },
    });

    return tipo;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Delete('productos/tipos/:id')
  async eliminarTipoProducto(@Param('id') id: string, @Request() req: any) {
    const tipo = await this.prisma.tipoProducto.findUnique({ where: { id } });
    if (!tipo) {
      throw new BadRequestException('El tipo de producto no existe.');
    }

    const prodCount = await this.prisma.producto.count({
      where: { tipoProducto: tipo.nombre },
    });
    const catCount = await this.prisma.categoria.count({
      where: { tipoProducto: tipo.nombre },
    });
    if (prodCount > 0 || catCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar el tipo de producto porque está en uso por productos o categorías.',
      );
    }

    await this.prisma.tipoProducto.delete({
      where: { id },
    });

    // Auditoría
    const userExists = req.user?.id
      ? await this.prisma.usuario.findUnique({ where: { id: req.user.id } })
      : null;
    await this.prisma.auditoria.create({
      data: {
        usuarioId: userExists ? req.user.id : null,
        usuarioNombre: req.user.nombre || 'Sistema',
        accion: 'ELIMINAR_TIPO_PRODUCTO',
        modulo: 'PRODUCTOS',
        detalles: JSON.stringify(tipo),
      },
    });

    return { message: 'Tipo de producto eliminado con éxito.' };
  }
}
