
import { Package, Field } from 'datapackage';
import { createLogger, IETL, ModCallback } from '../lib';
import Context, { emptyContext } from '../lib/context';
import { Callback, Executor, NoOpExecutor } from '../lib/executors';
import HPCCFrictionlessMod from '../lib/hpcc-frictionless';
import Mod, { AbstractMod } from '../lib/mod';
// import { IncomingMessage } from 'http';
// import https from 'https';

const LOGGER = createLogger("etljs::etl:hpcc-frictionless:test");


class TestMod extends AbstractMod<any> {
    mCalls: number = 0;
    get calls(): number {
        return this.mCalls;
    }
    handle(pParent: string, _pConfig: any, _pExecutor: Executor): Promise<any> {
        return new Promise((resolve, _reject) => {
          this.mCalls++;
          LOGGER.debug(
            "[%s] In test mod [%s]. Calls=%s",
            pParent,
            this.name,
            this.mCalls
          );
          resolve(this.mCalls);
        });
      }
}

describe("hpcc-sprays", function() {
    beforeEach(function(done: Function) {
      done();
    });
  
    afterEach(function(done: Function) {
      done();
    });

    const printInfo = (pkg:Package):void => {
        const resource = pkg.getResource('inflation-gdp');
        if ( resource == null ) {
            console.log('Resource not found');
        } else {
            console.log("Found resource:");
            console.log(resource);
            console.log("Source:");
            console.log(resource.source);
            const s = resource.schema;
            console.log("Schema:");
            console.log(s);
            console.log("Fields:");
            console.log(s.fields);
        }
    }

    const toECLType = (value: string): string => {
        switch (value.toLowerCase()) {
            case "string":
                return "STRING";
            case "year":
                return "INTEGER4";
            case "number":
                return "REAL8";
            case "integer":
                return "INTEGER8";
            case "boolean":
                return "BOOL";
            case "array":
                return "SET OF STRING";
            default:
                return "STRING";
        }
    }

    const generateELTemplate = (pkg:Package, resourceName: string): string => {
        const resource = pkg.getResource('inflation-gdp');
        if ( resource == null ) {
            console.log('Resource not found');
            // return Promise.reject(new Error(`Resource ${resourceName} not found.`));
            throw new Error(`Resource ${resourceName} not found.`);
        }
        const dataUrl = resource.source;
        let ecl = "layout := RECORD";
        resource.schema.fields.forEach((e:Field) => {
            ecl += " " + toECLType(e.type) + " " + e.name + ";";
        });
        ecl += " END;";
        ecl += ` ds := DATASET('~fristionless::${resourceName}::raw', layout, CSV);`;
        ecl += ` OUTPUT(ds,, '~frictionless::${resourceName}::desired', OVERWRITE);`
        const etlTemplate = `{
            "files": {
                "/var/lib/HPCCSystems/mydropzone/frictionless/${resourceName}/data.csv": {
                    "source": "${dataUrl}"
                }
            },
            "hpcc-sprays": {
                "frictionless::${resourceName}::raw": {
                    "format": "csv",
                    "destinationGroup": "mythor",
                    "sourcePath": "/var/lib/HPCCSystems/mydropzone/frictionless/${resourceName}/data.csv"
                }
            },
            "hpcc-ecls": {
                "000_layout": {
                    "cluster": "thor",
                    "content" : "${ecl}" 
                }
            }
        }`;
        // return Promise.resolve( JSON.parse( etlTemplate ) );
        // return Promise.resolve( etlTemplate );
        return etlTemplate;
    }

    it("real", function(done) {
        const oExecutor = new NoOpExecutor();
        const oTested = new HPCCFrictionlessMod();
        interface Activity {
            index: number;
            id: string;
            specs: any;
        }
        class ETL implements IETL {
            mActivities: Activity[] = [];
            mod(_pKey: string, _pSource: Mod, _pCallback?: ModCallback): void {}
            processActivity(
                pActivityIndex: number,
                _pTotalActivities: number,
                pActivityId: string,
                pActivity: any,
                _pPreviousActivityData: any,
                _pResults: any,
                _pContext: any
            ): Promise<any> {
                this.mActivities.push({ index: pActivityIndex, id: pActivityId, specs: pActivity });
                return Promise.resolve();
            }
            get activities(): Activity[] {
                return this.mActivities;
            }
        }
        const oETL = new ETL();
        oTested.register( oETL );
        const oTemplate = {
        root: {
            inflation_data: {
                source: "https://raw.githubusercontent.com/frictionlessdata/examples/master/inflation/datapackage.json",
                logicalFilenamePrefix: "~frictionless::inflation",
                targetDir: "/tmp/",
                resources: ["inflation-gdp", "inflation-consumer-gdp"]
            }
        }
        };
        const oContext: Context = {
            binary: ["0", "1"],
            years: ["2018", "2019", "2020"],
            ...emptyContext()
        };
        oTested
        .handle("root", oTemplate["root"], oExecutor, oContext)
        .then((data) => {
            console.log(data);
            console.log('Activities:');
            console.log(oETL.activities);
            done();
        })
        .catch((e:Error) => {
            done(e);
        });
    })
  
    it.skip("doit", async function() {
        // TODO: rewrite github urls to get raw content
        const url = "https://raw.githubusercontent.com/frictionlessdata/examples/master/inflation/datapackage.json";
        /*
        // Problem with this way is the Resource.source is a local path (like "./data/infaltion.csv", vs the full url.
        // We'd have to re-compute the full url from "url" and "Resource.source".
        https.get(url, (res: IncomingMessage) => {
            if (res.statusCode !== 200) {
                //TODO: Do something
                console.log("Didn't get 200 HTTP status code. Giving uptime.(status code = %s)", res.statusCode)
                return;
            }
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', async () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    const dataPackage = await Package.load(parsedData);
                    printInfo( dataPackage );
                } catch(e) {
                    console.log(e);
                }
                done();
            })
        });
        */
        const dataPackage = await Package.load( url );
        printInfo(dataPackage);
        const etlTemplate = generateELTemplate(dataPackage, "inflation-gdp");
        console.log("ETL Template:");
        console.log(etlTemplate);
        JSON.parse(etlTemplate);
        // done();
    });

});
