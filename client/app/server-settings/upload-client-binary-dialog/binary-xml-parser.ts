const debug = function (message) {
  console.log(message);
};

const NodeType = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  CDATA_SECTION_NODE: 4
};

const ChunkType = {
  NULL: 0x0000,
  STRING_POOL: 0x0001,
  TABLE: 0x0002,
  XML: 0x0003,
  XML_FIRST_CHUNK: 0x0100,
  XML_START_NAMESPACE: 0x0100,
  XML_END_NAMESPACE: 0x0101,
  XML_START_ELEMENT: 0x0102,
  XML_END_ELEMENT: 0x0103,
  XML_CDATA: 0x0104,
  XML_LAST_CHUNK: 0x017f,
  XML_RESOURCE_MAP: 0x0180,
  TABLE_PACKAGE: 0x0200,
  TABLE_TYPE: 0x0201,
  TABLE_TYPE_SPEC: 0x0202
};

const StringFlags = {
  SORTED: 1 << 0,
  UTF8: 1 << 8
};

const TypedValue = {
  COMPLEX_MANTISSA_MASK: 0x00ffffff,
  COMPLEX_MANTISSA_SHIFT: 0x00000008,
  COMPLEX_RADIX_0p23: 0x00000003,
  COMPLEX_RADIX_16p7: 0x00000001,
  COMPLEX_RADIX_23p0: 0x00000000,
  COMPLEX_RADIX_8p15: 0x00000002,
  COMPLEX_RADIX_MASK: 0x00000003,
  COMPLEX_RADIX_SHIFT: 0x00000004,
  COMPLEX_UNIT_DIP: 0x00000001,
  COMPLEX_UNIT_FRACTION: 0x00000000,
  COMPLEX_UNIT_FRACTION_PARENT: 0x00000001,
  COMPLEX_UNIT_IN: 0x00000004,
  COMPLEX_UNIT_MASK: 0x0000000f,
  COMPLEX_UNIT_MM: 0x00000005,
  COMPLEX_UNIT_PT: 0x00000003,
  COMPLEX_UNIT_PX: 0x00000000,
  COMPLEX_UNIT_SHIFT: 0x00000000,
  COMPLEX_UNIT_SP: 0x00000002,
  DENSITY_DEFAULT: 0x00000000,
  DENSITY_NONE: 0x0000ffff,
  TYPE_ATTRIBUTE: 0x00000002,
  TYPE_DIMENSION: 0x00000005,
  TYPE_FIRST_COLOR_INT: 0x0000001c,
  TYPE_FIRST_INT: 0x00000010,
  TYPE_FLOAT: 0x00000004,
  TYPE_FRACTION: 0x00000006,
  TYPE_INT_BOOLEAN: 0x00000012,
  TYPE_INT_COLOR_ARGB4: 0x0000001e,
  TYPE_INT_COLOR_ARGB8: 0x0000001c,
  TYPE_INT_COLOR_RGB4: 0x0000001f,
  TYPE_INT_COLOR_RGB8: 0x0000001d,
  TYPE_INT_DEC: 0x00000010,
  TYPE_INT_HEX: 0x00000011,
  TYPE_LAST_COLOR_INT: 0x0000001f,
  TYPE_LAST_INT: 0x0000001f,
  TYPE_NULL: 0x00000000,
  TYPE_REFERENCE: 0x00000001,
  TYPE_STRING: 0x00000003
};

export class BinaryXmlParser {
  cursor = 0;
  strings = [];
  resources = [];
  document = null;
  parent = null;
  stack = [];
  constructor(public buffer) { }

  readU8() {
    var val;
    val = this.buffer[this.cursor];
    this.cursor += 1;
    return val;
  };

  readU16() {
    var val;
    val = this.buffer.readUInt16LE(this.cursor);
    this.cursor += 2;
    return val;
  };
  
  readS32() {
    var val;
    val = this.buffer.readInt32LE(this.cursor);
    this.cursor += 4;
    return val;
  };
  
  readU32(){
    var val;
    val = this.buffer.readUInt32LE(this.cursor);
    this.cursor += 4;
    return val;
  };
  
  readLength8(){
    var len;
    len = this.readU8();
    if (len & 0x80) {
      len = (len & 0x7f) << 7;
      len += this.readU8();
    }
    return len;
  };
  
  readLength16() {
    var len;
    len = this.readU16();
    if (len & 0x8000) {
      len = (len & 0x7fff) << 15;
      len += this.readU16();
    }
    return len;
  };
  
  readDimension() {
    var dimension, unit, value;
    dimension = {
      value: null,
      unit: null,
      rawUnit: null
    };
    value = this.readU32();
    unit = dimension.value & 0xff;
    dimension.value = value >> 8;
    dimension.rawUnit = unit;
    switch (unit) {
      case TypedValue.COMPLEX_UNIT_MM:
        dimension.unit = 'mm';
        break;
      case TypedValue.COMPLEX_UNIT_PX:
        dimension.unit = 'px';
        break;
      case TypedValue.COMPLEX_UNIT_DIP:
        dimension.unit = 'dp';
        break;
      case TypedValue.COMPLEX_UNIT_SP:
        dimension.unit = 'sp';
        break;
      case TypedValue.COMPLEX_UNIT_PT:
        dimension.unit = 'pt';
        break;
      case TypedValue.COMPLEX_UNIT_IN:
        dimension.unit = 'in';
    }
    return dimension;
  };
  
  readFraction() {
    var fraction, type, value;
    fraction = {
      value: null,
      type: null,
      rawType: null
    };
    value = this.readU32();
    type = value & 0xf;
    fraction.value = this.convertIntToFloat(value >> 4);
    fraction.rawType = type;
    switch (type) {
      case TypedValue.COMPLEX_UNIT_FRACTION:
        fraction.type = '%';
        break;
      case TypedValue.COMPLEX_UNIT_FRACTION_PARENT:
        fraction.type = '%p';
    }
    return fraction;
  };
  
  readHex24() {
    return (this.readU32() & 0xffffff).toString(16);
  };
  
  readHex32() {
    return this.readU32().toString(16);
  };
  
  readTypedValue() {
    var dataType, diff, end, id, ref, size, start, type, typedValue, zero;
    typedValue = {
      value: null,
      type: null,
      rawType: null
    };
    start = this.cursor;
    size = this.readU16();
    zero = this.readU8();
    dataType = this.readU8();
    typedValue.rawType = dataType;
    switch (dataType) {
      case TypedValue.TYPE_INT_DEC:
        typedValue.value = this.readS32();
        typedValue.type = 'int_dec';
        break;
      case TypedValue.TYPE_INT_HEX:
        typedValue.value = this.readS32();
        typedValue.type = 'int_hex';
        break;
      case TypedValue.TYPE_STRING:
        ref = this.readS32();
        typedValue.value = ref > 0 ? this.strings[ref] : '';
        typedValue.type = 'string';
        break;
      case TypedValue.TYPE_REFERENCE:
        id = this.readU32();
        typedValue.value = "resourceId:0x" + (id.toString(16));
        typedValue.type = 'reference';
        break;
      case TypedValue.TYPE_INT_BOOLEAN:
        typedValue.value = this.readS32() !== 0;
        typedValue.type = 'boolean';
        break;
      case TypedValue.TYPE_NULL:
        this.readU32();
        typedValue.value = null;
        typedValue.type = 'null';
        break;
      case TypedValue.TYPE_INT_COLOR_RGB8:
        typedValue.value = this.readHex24();
        typedValue.type = 'rgb8';
        break;
      case TypedValue.TYPE_INT_COLOR_RGB4:
        typedValue.value = this.readHex24();
        typedValue.type = 'rgb4';
        break;
      case TypedValue.TYPE_INT_COLOR_ARGB8:
        typedValue.value = this.readHex32();
        typedValue.type = 'argb8';
        break;
      case TypedValue.TYPE_INT_COLOR_ARGB4:
        typedValue.value = this.readHex32();
        typedValue.type = 'argb4';
        break;
      case TypedValue.TYPE_DIMENSION:
        typedValue.value = this.readDimension();
        typedValue.type = 'dimension';
        break;
      case TypedValue.TYPE_FRACTION:
        typedValue.value = this.readFraction();
        typedValue.type = 'fraction';
        break;
      default:
        type = dataType.toString(16);
        debug("Not sure what to do with typed value of type 0x" + type + ", falling back to reading an uint32");
        typedValue.value = this.readU32();
        typedValue.type = 'unknown';
    }
    end = start + size;
    if (this.cursor !== end) {
      type = dataType.toString(16);
      diff = end - this.cursor;
      debug("Cursor is off by " + diff + " bytes at " + this.cursor + " at supposed end of typed value of type 0x" + type + ". The typed value started at offset " + start + " and is supposed to end at offset " + end + ". Ignoring the rest of the value.");
      this.cursor = end;
    }
    return typedValue;
  };
  
  convertIntToFloat(int) {
    var buf;
    buf = new ArrayBuffer(4);
    new (new Int32Array(buf)[0] = buf);
    return new Float32Array(buf)[0];
  };
  
  readString(encoding) {
    var byteLength, stringLength, value;
    switch (encoding) {
      case 'utf-8':
        stringLength = this.readLength8();
        byteLength = this.readLength8();
        value = this.buffer.toString(encoding, this.cursor, this.cursor += byteLength);
        // https://github.com/openstf/adbkit-apkreader/issues/9
        // RangeError: Index out of range
        this.readU8();
        return value;
      case 'ucs2':
        stringLength = this.readLength16();
        byteLength = stringLength * 2;
        value = this.buffer.toString(encoding, this.cursor, this.cursor += byteLength);
        this.readU16();
        return value;
      default:
        throw new Error("Unsupported encoding '" + encoding + "'");
    }
  };
  
  readChunkHeader() {
    return {
      chunkType: this.readU16(),
      headerSize: this.readU16(),
      chunkSize: this.readU32()
    };
  };
  
  readStringPool(header) {
    var anchor, encoding, i, j, offsets, ref1, ref2;
    header.stringCount = this.readU32();
    header.styleCount = this.readU32();
    header.flags = this.readU32();
    header.stringsStart = this.readU32();
    header.stylesStart = this.readU32();
    if (header.chunkType !== ChunkType.STRING_POOL) {
      throw new Error('Invalid string pool header');
    }
    anchor = this.cursor;
    offsets = [];
    for (i = 0, ref1 = header.stringCount; 0 <= ref1 ? i < ref1 : i > ref1; 0 <= ref1 ? i++ : i--) {
      offsets.push(this.readU32());
    }
    encoding = header.flags & StringFlags.UTF8 ? 'utf-8' : 'ucs2';
    this.cursor = anchor + header.stringsStart - header.headerSize;
    for (j = 0, ref2 = header.stringCount; 0 <= ref2 ? j < ref2 : j > ref2; 0 <= ref2 ? j++ : j--) {
      this.strings.push(this.readString(encoding));
    }
    this.cursor = anchor + header.chunkSize - header.headerSize;
    return null;
  };
  
  readResourceMap(header) {
    var count, i, ref1;
    count = Math.floor((header.chunkSize - header.headerSize) / 4);
    for (i = 0, ref1 = count; 0 <= ref1 ? i < ref1 : i > ref1; 0 <= ref1 ? i++ : i--) {
      this.resources.push(this.readU32());
    }
    return null;
  };
  
  readXmlNamespaceStart(header) {
    var commentRef, line, prefixRef, uriRef;
    line = this.readU32();
    commentRef = this.readU32();
    prefixRef = this.readS32();
    uriRef = this.readS32();
    return null;
  };
  
  readXmlNamespaceEnd(header) {
    var commentRef, line, prefixRef, uriRef;
    line = this.readU32();
    commentRef = this.readU32();
    prefixRef = this.readS32();
    uriRef = this.readS32();
    return null;
  };
  
  readXmlElementStart(header) {
    var attrCount, attrSize, attrStart, classIndex, commentRef, i, idIndex, line, nameRef, node, nsRef, ref1, styleIndex;
    node = {
      namespaceURI: null,
      nodeType: NodeType.ELEMENT_NODE,
      nodeName: null,
      fields: [],
      childNodes: []
    };
    line = this.readU32();
    commentRef = this.readU32();
    nsRef = this.readS32();
    nameRef = this.readS32();
    if (nsRef > 0) {
      node.namespaceURI = this.strings[nsRef];
    }
    node.nodeName = this.strings[nameRef];
    attrStart = this.readU16();
    attrSize = this.readU16();
    attrCount = this.readU16();
    idIndex = this.readU16();
    classIndex = this.readU16();
    styleIndex = this.readU16();
    for (i = 0, ref1 = attrCount; 0 <= ref1 ? i < ref1 : i > ref1; 0 <= ref1 ? i++ : i--) {
      node.fields.push(this.readXmlField());
    }
    if (this.document) {
      this.parent.childNodes.push(node);
      this.parent = node;
    } else {
      this.document = this.parent = node;
    }
    this.stack.push(node);
    return node;
  };
  
  readXmlField() {
    var attr, nameRef, nsRef, valueRef;
    attr = {
      namespaceURI: null,
      nodeType: NodeType.ATTRIBUTE_NODE,
      nodeName: null,
      name: null,
      value: null,
      typedValue: null
    };
    nsRef = this.readS32();
    nameRef = this.readS32();
    valueRef = this.readS32();
    if (nsRef > 0) {
      attr.namespaceURI = this.strings[nsRef];
    }
    attr.nodeName = attr.name = this.strings[nameRef];
    if (valueRef > 0) {
      attr.value = this.strings[valueRef];
    }
    attr.typedValue = this.readTypedValue();
    return attr;
  };
  
  readXmlElementEnd(header) {
    var commentRef, line, nameRef, nsRef;
    line = this.readU32();
    commentRef = this.readU32();
    nsRef = this.readS32();
    nameRef = this.readS32();
    this.stack.pop();
    this.parent = this.stack[this.stack.length - 1];
    return null;
  };
  
  readXmlCData(header) {
    var cdata, commentRef, dataRef, line;
    cdata = {
      namespaceURI: null,
      nodeType: NodeType.CDATA_SECTION_NODE,
      nodeName: '#cdata',
      data: null,
      typedValue: null
    };
    line = this.readU32();
    commentRef = this.readU32();
    dataRef = this.readS32();
    if (dataRef > 0) {
      cdata.data = this.strings[dataRef];
    }
    cdata.typedValue = this.readTypedValue();
    this.parent.childNodes.push(cdata);
    return cdata;
  };
  
  readNull(header) {
    this.cursor += header.chunkSize - header.headerSize;
    return null;
  };

  parse() {
    var diff, end, header, resMapHeader, start, type, xmlHeader;
    xmlHeader = this.readChunkHeader();
    if (xmlHeader.chunkType !== ChunkType.XML) {
      console.log('xmlHeader', xmlHeader);
      throw new Error('Invalid XML header');
    }
    this.readStringPool(this.readChunkHeader());
    resMapHeader = this.readChunkHeader();
    if (resMapHeader.chunkType === ChunkType.XML_RESOURCE_MAP) {
      this.readResourceMap(resMapHeader);
      this.readXmlNamespaceStart(this.readChunkHeader());
    } else {
      this.readXmlNamespaceStart(resMapHeader);
    }
    while (this.cursor < this.buffer.length) {
      start = this.cursor;
      header = this.readChunkHeader();
      switch (header.chunkType) {
        case ChunkType.XML_START_NAMESPACE:
          this.readXmlNamespaceStart(header);
          break;
        case ChunkType.XML_END_NAMESPACE:
          this.readXmlNamespaceEnd(header);
          break;
        case ChunkType.XML_START_ELEMENT:
          this.readXmlElementStart(header);
          break;
        case ChunkType.XML_END_ELEMENT:
          this.readXmlElementEnd(header);
          break;
        case ChunkType.XML_CDATA:
          this.readXmlCData(header);
          break;
        case ChunkType.NULL:
          this.readNull(header);
          break;
        default:
          throw new Error("Unsupported chunk type '" + header.chunkType + "'");
      }
      end = start + header.chunkSize;
      if (this.cursor !== end) {
        diff = end - this.cursor;
        type = header.chunkType.toString(16);
        debug("Cursor is off by " + diff + " bytes at " + this.cursor + " at supposed end of chunk of type 0x" + type + ". The chunk started at offset " + start + " and is supposed to end at offset " + end + ". Ignoring the rest of the chunk.");
        this.cursor = end;
      }
    }
    return this.document;
  };
}