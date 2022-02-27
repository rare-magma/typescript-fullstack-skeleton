type DdbOneTableConfig = {
    tableName: string;
    indexes: { [key: string]: { hash?: string; sort?: string; follow?: boolean; type?: 'local' } };
    schemas?: string[];
    logger?: boolean;
    isoDates?: boolean;
};

export default DdbOneTableConfig;
