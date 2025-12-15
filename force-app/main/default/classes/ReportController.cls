public class ReportController {
    
    @AuraEnabled
    public static String runReport(String reportName) {
        
        List<Report> rep = [SELECT Id, DeveloperName FROM Report 
                            WHERE DeveloperName = :reportName 
                            WITH USER_MODE LIMIT 1];

        if (rep.size() == 0) {
            return 'Report not found';
        }
        Reports.ReportResults results = Reports.ReportManager.runReport(rep[0].Id, true);
        Map<String,Reports.ReportFact> reportFacts = results.getFactMap();
        // System.debug(reportFacts.getAggregates());
        // System.debug(results.getFactMap()());
        // String averageSla = reportFacts.values()[0].getAggregates()[1].getLabel();
        // List<String> toReturn = new List<String>{averageSla, JSON.serialize(results)};
        // System.debug(toReturn);
        return JSON.serialize(results);
    }
}