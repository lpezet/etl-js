declare module "datapackage" {
  export class Package {
    static load(description: any, options?: any): Promise<Package>;
    get resources(): Resource[];
    getResource(name: string): Resource | null;
  }

  export class Profile {
    /**
     * Name
     *
     * @returns {string}
     */
    get name(): string;

    /**
     * JsonSchema
     *
     * @returns {Object}
     */
    get jsonschema(): any;
  }

  export class Field {
    /**
     * Field name
     *
     * @returns {string}
     */
    get name(): string;

    /**
     * Field type
     *
     * @returns {string}
     */
    get type(): string;

    /**
     * Field format
     *
     * @returns {string}
     */
    get format(): string;

    /**
     * Return true if field is required
     *
     * @returns {boolean}
     */
    get required(): boolean;

    /**
     * Field constraints
     *
     * @returns {Object}
     */
    get constraints(): any;

    /**
     * Field descriptor
     *
     * @returns {Object}
     */
    get descriptor(): any;
  }

  export class Schema {
    /**
     * Validation status
     *
     * It always `true` in strict mode.
     *
     * @returns {Boolean} returns validation status
     */
    get valid(): boolean;

    /**
     * Validation errors
     *
     * It always empty in strict mode.
     *
     * @returns {Error[]} returns validation errors
     */
    get errors(): Error[];

    /**
     * Descriptor
     *
     * @returns {Object} schema descriptor
     */
    get descriptor(): any;

    /**
     * Primary Key
     *
     * @returns {string[]} schema primary key
     */
    get primaryKey(): string[];

    /**
     * Foreign Keys
     *
     * @returns {Object[]} schema foreign keys
     */
    get foreignKeys(): any[];

    /**
     * Fields
     *
     * @returns {Field[]} schema fields
     */
    get fields(): Field[];

    /**
     * Field names
     *
     * @returns {string[]} schema field names
     */
    get fieldNames(): string[];

    /**
     * Return a field
     *
     * @param {string} fieldName
     * @returns {(Field|null)} field instance if exists
     */
    getField(fieldName: string, options?: { index: number }): Field | null;
  }

  export class Resource {
    static load(descriptor: any, options?: any): Resource;
    /**
     * Validation status
     *
     * It always `true` in strict mode.
     *
     * @returns {Boolean} returns validation status
     */
    get valid(): boolean;

    /**
     * Validation errors
     *
     * It always empty in strict mode.
     *
     * @returns {Error[]} returns validation errors
     */
    get errors(): Error[];

    /**
     * Profile
     *
     * @returns {Profile}
     */
    get profile(): Profile;

    /**
     * Descriptor
     *
     * @returns {Object} schema descriptor
     */
    get descriptor(): any;

    /**
     * Name
     *
     * @returns {string}
     */
    get name(): string;

    /**
     * Whether resource is inline
     *
     * @returns {boolean}
     */
    get inline(): boolean;

    /**
     * Whether resource is local
     *
     * @returns {boolean}
     */
    get local(): boolean;

    /**
     * Whether resource is remote
     *
     * @returns {boolean}
     */
    get remote(): boolean;

    /**
     * Whether resource is multipart
     *
     * @returns {boolean}
     */
    get multipart(): boolean;

    /**
     * Whether resource is tabular
     *
     * @returns {boolean}
     */
    get tabular(): boolean;

    /**
     * Source
     *
     * Combination of `resource.source` and `resource.inline/local/remote/multipart`
     * provides predictable interface to work with resource data.
     *
     * @returns {Array|string}
     */
    get source(): Array<string> | string;

    /**
     * Headers
     *
     * > Only for tabular resources
     *
     * @returns {string[]} data source headers
     */
    get headers(): string[];

    /**
     * Schema
     *
     * > Only for tabular resources
     *
     * @returns {tableschema.Schema}
     */
    get schema(): Schema;
  }

  //export static function Package.load(description: any, options: any): Package;
}
